import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

// TODO: remplacer par le vrai projectId (donné par `sanity init` / manage.sanity.io)
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'VOTRE_PROJECT_ID';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineConfig({
  name: 'denisoudure',
  title: 'DeniSoudure — Réalisations',
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
