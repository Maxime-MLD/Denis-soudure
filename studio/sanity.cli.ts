import { defineCliConfig } from 'sanity/cli';

// TODO: remplacer par le vrai projectId
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'VOTRE_PROJECT_ID';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineCliConfig({
  api: { projectId, dataset },
  /* Personnalise l'URL du studio hébergé : https://denisoudure.sanity.studio */
  studioHost: 'denisoudure',
});
