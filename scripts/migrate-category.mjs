/**
 * Migration ponctuelle : renomme la catégorie d'anciens documents Sanity.
 * Usage : node scripts/migrate-category.mjs "Pergola" "Abris" [--dry-run]
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const [FROM, TO] = args.filter((a) => !a.startsWith('--'));
if (!FROM || !TO) {
  console.error('Usage : node scripts/migrate-category.mjs "<Ancienne>" "<Nouvelle>" [--dry-run]');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const ids = await client.fetch('*[_type=="realisation" && category==$from]._id', { from: FROM });
console.log(`${ids.length} document(s) « ${FROM} » -> « ${TO} »${DRY ? ' (SIMULATION)' : ''}`);

if (!DRY && ids.length) {
  let tx = client.transaction();
  for (const id of ids) tx = tx.patch(id, { set: { category: TO } });
  await tx.commit();
  console.log('✅ Migration effectuée.');
} else if (!ids.length) {
  console.log('Rien à migrer.');
}
