/**
 * Import en masse des réalisations dans Sanity depuis des dossiers par catégorie.
 *
 * Arborescence attendue (à la racine du projet, dossier `photos-import/`) :
 *   photos-import/
 *     Escalier/       -> photo1.jpg, photo2.jpg ...
 *     Portails/       -> ...
 *     Caisse à chien/ -> ...
 *     Brise-vue/      -> ...
 *     Verrière/       -> ...
 *
 * Les noms de dossiers sont tolérants (accents, majuscules, pluriels : "Escaliers",
 * "brise vue", "chenils"… sont reconnus).
 *
 * Usage :
 *   node scripts/import-realisations.mjs --dry-run   # simulation (n'envoie rien)
 *   node scripts/import-realisations.mjs             # import réel
 *   node scripts/import-realisations.mjs --force     # ré-importe même les déjà présentes
 *   node scripts/import-realisations.mjs ./autre-dossier
 *
 * Nécessite dans .env :
 *   PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET
 *   SANITY_API_WRITE_TOKEN   (jeton rôle "Editor", créé sur sanity.io/manage → API → Tokens)
 */
import { createClient } from '@sanity/client';
import { createReadStream, readFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* --- Petit chargeur .env (sans dépendance) --- */
function loadEnv(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || m[1] in process.env) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  } catch {
    /* pas de .env : on utilisera les variables déjà présentes */
  }
}
loadEnv(path.join(ROOT, '.env'));

/* --- Config métier --- */
const BUSINESS = 'DeniSoudure';
const LOCATION = 'Roanne';

const CATEGORIES = [
  'Brise-vue', 'Caisse à chien', 'Escalier', 'Garde-corps', 'Pergola', 'Portails', 'Verrière', 'Autres',
];
const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const CATEGORY_BY_NORM = new Map(CATEGORIES.map((c) => [norm(c), c]));
const ALIASES = {
  brisevue: 'Brise-vue', brisevues: 'Brise-vue',
  caisseachien: 'Caisse à chien', caissesachien: 'Caisse à chien', caisse: 'Caisse à chien',
  chenil: 'Caisse à chien', chenils: 'Caisse à chien',
  escalier: 'Escalier', escaliers: 'Escalier',
  gardecorps: 'Garde-corps', gardecorp: 'Garde-corps', gardescorps: 'Garde-corps',
  pergola: 'Pergola', pergolas: 'Pergola',
  portail: 'Portails', portails: 'Portails',
  verriere: 'Verrière', verrieres: 'Verrière',
  autre: 'Autres', autres: 'Autres', divers: 'Autres',
};
const resolveCategory = (folder) => CATEGORY_BY_NORM.get(norm(folder)) ?? ALIASES[norm(folder)] ?? null;

const IMG_RE = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;

function titleFromFile(file, category, index) {
  const base = file.replace(/\.[^.]+$/, '');
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const generic =
    /^(img|dsc|dscf|photo|image|pxl|screenshot)([\s_-]*\d+)?$/i.test(base) || /^\d+$/.test(base);
  if (!cleaned || generic) return `${category} ${index}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const altFor = (category) => `${category} sur-mesure réalisé par ${BUSINESS} à ${LOCATION}`;
const docId = (category, file) =>
  'realisation-' + createHash('sha1').update(`${category}/${file}`).digest('hex').slice(0, 16);

/* --- Arguments --- */
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FORCE = args.includes('--force');
const dirArg = args.find((a) => !a.startsWith('--'));
const PHOTOS_DIR = path.resolve(ROOT, dirArg ?? 'photos-import');

/* --- Vérifs env --- */
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('❌ PUBLIC_SANITY_PROJECT_ID manquant dans .env');
  process.exit(1);
}
if (!token && !DRY) {
  console.error('❌ SANITY_API_WRITE_TOKEN manquant dans .env (jeton "Editor" sur sanity.io/manage → API → Tokens)');
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false });

/* --- Import --- */
async function run() {
  console.log(`\n📁 Dossier source : ${PHOTOS_DIR}`);
  console.log(`   Projet : ${projectId} / ${dataset}${DRY ? '   (SIMULATION — rien ne sera envoyé)' : ''}\n`);

  let entries;
  try {
    entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
  } catch {
    console.error(`❌ Dossier introuvable : ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const existingIds = DRY ? new Set() : new Set(await client.fetch('*[_type=="realisation"]._id'));

  let imported = 0, skipped = 0, ignored = 0;
  const unknownFolders = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const category = resolveCategory(entry.name);
    if (!category) {
      unknownFolders.push(entry.name);
      continue;
    }

    const dir = path.join(PHOTOS_DIR, entry.name);
    const files = (await readdir(dir)).filter((f) => IMG_RE.test(f)).sort();
    console.log(`\n▶ ${category}  (dossier « ${entry.name} » — ${files.length} image(s))`);

    let index = 0;
    for (const file of files) {
      index += 1;
      const id = docId(category, file);
      const title = titleFromFile(file, category, index);

      if (existingIds.has(id) && !FORCE) {
        console.log(`   ⏭  déjà importée : ${file}`);
        skipped += 1;
        continue;
      }

      if (DRY) {
        console.log(`   ○ (simu) ${file}  →  « ${title} »`);
        imported += 1;
        continue;
      }

      try {
        const asset = await client.assets.upload('image', createReadStream(path.join(dir, file)), {
          filename: file,
        });
        await client.createOrReplace({
          _id: id,
          _type: 'realisation',
          title,
          category,
          image: {
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id },
            alt: altFor(category),
          },
        });
        console.log(`   ✅ ${file}  →  « ${title} »`);
        imported += 1;
      } catch (err) {
        console.error(`   ❌ échec ${file} : ${err.message}`);
        ignored += 1;
      }
    }
  }

  console.log('\n───────────────────────────────');
  console.log(`✅ Importées : ${imported}${DRY ? ' (simulation)' : ''}`);
  if (skipped) console.log(`⏭  Ignorées (déjà présentes) : ${skipped}  → --force pour les refaire`);
  if (ignored) console.log(`❌ Échecs : ${ignored}`);
  if (unknownFolders.length) {
    console.log(`\n⚠ Dossiers non reconnus (ignorés) : ${unknownFolders.join(', ')}`);
    console.log(`   Catégories valides : ${CATEGORIES.join(', ')}`);
  }
  console.log('');
  if (!DRY && imported > 0) {
    console.log('👉 Pense à redéployer/rebuild le site pour voir les photos en ligne.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
