import type { ImageMetadata } from 'astro';

export const CATEGORIES = [
  'Brise-vue',
  'Caisse à chien',
  'Escalier',
  'Portails',
  'Verrière',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Realisation {
  category: Category;
  title: string;
  /** Image réelle (import astro:assets) — null tant que la photo n'est pas fournie (placeholder affiché) */
  image: ImageMetadata | null;
  alt: string;
}

/* TODO: remplacer les placeholders par les vraies photos (5 catégories × 4) */
export const realisations: Realisation[] = CATEGORIES.flatMap((category) =>
  [1, 2, 3, 4].map((n) => ({
    category,
    title: `${category} ${n}`,
    image: null,
    alt: `${category} sur-mesure réalisée par DeniSoudure, artisan soudeur à Roanne — photo ${n}`,
  })),
);
