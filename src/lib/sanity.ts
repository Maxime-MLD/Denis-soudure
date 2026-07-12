/**
 * Accès aux réalisations gérées par le client dans Sanity.
 * - Si Sanity n'est pas configuré (pas de PUBLIC_SANITY_PROJECT_ID), on retombe
 *   sur les placeholders : le site continue de fonctionner et de builder.
 * - Sinon on récupère les documents `realisation` et on construit les URLs
 *   d'images optimisées (WebP + tailles responsives) via le CDN Sanity.
 */
import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import {
  CATEGORIES,
  placeholderRealisations,
  type Category,
  type RealisationItem,
} from '../data/realisations';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ?? 'production';
// Optionnel : jeton de lecture si le dataset est privé (jamais exposé au client)
const token = import.meta.env.SANITY_API_READ_TOKEN as string | undefined;

export const isSanityConfigured = Boolean(projectId);

const client = isSanityConfigured
  ? createClient({
      projectId: projectId!,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: !token,
      token: token || undefined,
    })
  : null;

const builder = isSanityConfigured ? createImageUrlBuilder({ projectId: projectId!, dataset }) : null;

interface SanityRealisation {
  title: string;
  category: Category;
  alt?: string;
  image: {
    asset?: { _id?: string; metadata?: { lqip?: string } };
    crop?: unknown;
    hotspot?: unknown;
  };
}

const DISPLAY_WIDTHS = [400, 800, 1200];

export async function getRealisations(): Promise<RealisationItem[]> {
  if (!client || !builder) return placeholderRealisations;

  const query = `*[_type == "realisation" && defined(image.asset)]
    | order(coalesce(order, 9999) asc, _createdAt desc){
      title,
      category,
      "alt": coalesce(alt, image.alt, title),
      image{ ..., asset->{ _id, metadata{ lqip } } }
    }`;

  let docs: SanityRealisation[] = [];
  try {
    docs = await client.fetch<SanityRealisation[]>(query);
  } catch (error) {
    // En cas de souci réseau/config au build, on ne casse pas le site.
    console.error('[sanity] Échec du chargement des réalisations, repli placeholders :', error);
    return placeholderRealisations;
  }

  return docs
    .filter((d) => CATEGORIES.includes(d.category))
    .map((d) => {
      const base = builder.image(d.image).auto('format').fit('max');
      return {
        category: d.category,
        title: d.title,
        alt: d.alt ?? `${d.title} — réalisation DeniSoudure à Roanne`,
        image: {
          src: base.width(800).url(),
          srcset: DISPLAY_WIDTHS.map((w) => `${base.width(w).url()} ${w}w`).join(', '),
          full: base.width(1600).url(),
          width: 800,
          height: 600,
          lqip: d.image.asset?.metadata?.lqip,
        },
      } satisfies RealisationItem;
    });
}
