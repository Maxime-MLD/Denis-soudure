/**
 * Catégories, types et données de repli des réalisations.
 * Les vraies données proviennent de Sanity (voir src/lib/sanity.ts).
 * Tant que Sanity n'est pas configuré, on affiche les placeholders ci-dessous.
 */
export const CATEGORIES = [
  "Brise-vue",
  "Caisse à chien",
  "Escalier",
  "Garde-corps",
  "Pergola",
  "Portails",
  "Verrière",
  "Autres",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Image normalisée prête à l'affichage (URLs Sanity ou null si placeholder). */
export interface RealisationImage {
  /** Source par défaut (taille d'affichage) */
  src: string;
  /** srcset responsive */
  srcset: string;
  /** Version large pour la lightbox */
  full: string;
  width: number;
  height: number;
  /** Aperçu flouté base64 (LQIP) éventuel */
  lqip?: string;
}

export interface RealisationItem {
  category: Category;
  title: string;
  alt: string;
  /** null = pas de photo → placeholder affiché */
  image: RealisationImage | null;
}

/** Données de repli : 4 placeholders par catégorie (aucune photo). */
export const placeholderRealisations: RealisationItem[] = CATEGORIES.flatMap(
  (category) =>
    [1, 2, 3, 4].map((n) => ({
      category,
      title: `${category} ${n}`,
      image: null,
      alt: `${category} sur-mesure réalisée par DeniSoudure, artisan soudeur à Roanne — photo ${n}`,
    })),
);
