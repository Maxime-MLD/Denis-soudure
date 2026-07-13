import { defineField, defineType } from 'sanity';

/** Doit rester synchronisé avec CATEGORIES de src/data/realisations.ts */
export const CATEGORIES = [
  'Abris',
  'Brise-vue',
  'Caisse à chien',
  'Escalier',
  'Garde-corps',
  'Portails',
  'Verrière',
  'Autres',
] as const;

export default defineType({
  name: 'realisation',
  title: 'Réalisation',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Catégorie',
      type: 'string',
      options: {
        list: CATEGORIES.map((c) => ({ title: c, value: c })),
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Texte alternatif (SEO / accessibilité)',
          type: 'string',
          description: 'Décrit la photo en une phrase, ex : « Caisse à chien alu sur pick-up ».',
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Ordre d’affichage',
      type: 'number',
      description: 'Plus le nombre est petit, plus la photo apparaît en premier. Laisser vide = récent en premier.',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'category', media: 'image' },
  },
});
