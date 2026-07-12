# Gestion des photos par le client (Sanity)

Le client ajoute/supprime ses réalisations depuis une interface web (Sanity Studio),
choisit la catégorie, publie — et le site se met à jour tout seul via Vercel.

> Tant que les variables Sanity ne sont pas renseignées, le site affiche les
> placeholders : rien ne casse pendant la configuration.

---

## 1. Créer le projet Sanity (une seule fois)

1. Crée un compte sur https://www.sanity.io (Google / e-mail).
2. Va sur https://www.sanity.io/manage → **Create new project**.
   - Nom : `DeniSoudure`
   - Dataset : `production`, visibilité **Public** (lecture sans jeton).
3. Note le **Project ID** affiché (ex. `a1b2c3d4`).

## 2. Déployer le Studio (l'interface du client)

Dans le dossier `studio/` :

```bash
cd studio
npm install
# renseigne l'identifiant du projet
echo "SANITY_STUDIO_PROJECT_ID=TON_PROJECT_ID" > .env
echo "SANITY_STUDIO_DATASET=production" >> .env

npx sanity login      # se connecter
npx sanity deploy     # publie le studio
```

Le studio est alors accessible sur **https://denisoudure.sanity.studio**
(le sous-domaine `denisoudure` est défini dans `studio/sanity.cli.ts`).

➡️ Donne cette URL + un accès au client :
`sanity.io/manage` → projet → **Members** → *Invite* (rôle **Editor**).
Il pourra se connecter, ajouter une photo, choisir la catégorie, publier.

## 3. Brancher le site Astro sur Sanity

Dans **Vercel** → projet → **Settings → Environment Variables**, ajoute :

| Nom                         | Valeur              |
| --------------------------- | ------------------- |
| `PUBLIC_SANITY_PROJECT_ID`  | `TON_PROJECT_ID`    |
| `PUBLIC_SANITY_DATASET`     | `production`        |

(En local, mets les mêmes dans `denisoudure/.env` — voir `.env.example`.)

Redéploie une fois : le site charge désormais les réalisations depuis Sanity.

## 4. Mise à jour automatique quand le client publie

Le site est statique : il faut le reconstruire à chaque changement. On automatise :

1. **Vercel** → Settings → **Git → Deploy Hooks** → crée un hook
   (nom : `sanity`, branche : `main`) → copie l'URL générée.
2. **sanity.io/manage** → projet → **API → Webhooks** → *Create webhook* :
   - URL : l'URL du Deploy Hook Vercel
   - Dataset : `production`
   - Trigger on : **Create / Update / Delete**
   - Filter (optionnel) : `_type == "realisation"`

Désormais : le client publie une photo → Vercel reconstruit → en ligne en ~1 min,
**sans intervention de ta part.**

---

## Comment ça marche côté code

- `src/lib/sanity.ts` : `getRealisations()` récupère les documents `realisation`,
  trie par `order` puis date, et fabrique les URLs d'images optimisées (WebP +
  tailles responsives) via le CDN Sanity. Repli automatique sur les placeholders
  si Sanity n'est pas configuré ou en cas d'erreur réseau.
- `src/data/realisations.ts` : catégories (source de vérité), types et placeholders.
- Le champ **Catégorie** du studio (`studio/schemaTypes/realisation.ts`) utilise la
  même liste que le site. Si tu ajoutes une catégorie, mets-la à jour aux deux endroits.
