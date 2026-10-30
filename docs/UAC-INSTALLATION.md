# Espace UAC — installation pas à pas

L'onglet **UAC** de « Ça parle » (menu du jour + actualités) a besoin de **2 collections**, **1 fonction** et **3 variables Netlify**. Compte 15 minutes.

## 1. Créer les deux collections (script)

Dans le dossier du projet, un terminal :

```
npm install node-appwrite --no-save
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
APPWRITE_PROJECT_ID=<ton projet> \
APPWRITE_API_KEY=<clé API avec le scope databases.write> \
APPWRITE_DATABASE_ID=<ta base> \
node scripts/setupUac.mjs
```

Il crée `uac_restaurants` et `uac_news` avec leurs attributs et index. Tu peux le relancer sans risque. Si un index échoue (les attributs n'étaient pas encore prêts), relance-le.
Contrôle dans la Console Appwrite → Databases : les deux collections existent, onglet *Settings* → *Permissions* : **Users → Read** uniquement (personne ne peut écrire directement : tout passe par la fonction).

## 2. Créer la fonction `manage-uac`

1. Console Appwrite → **Functions** → **Create function**, nom `manage-uac`, runtime Node.js (le même que tes autres fonctions).
2. Dépose le contenu du dossier `functions/manage-uac` (`package.json` + `src/main.js` + `src/lib.js`) ; **Entrypoint** : `src/main.js`.
3. **Settings → Execute access** : coche **Users** (tout utilisateur connecté). La fonction vérifie elle-même qui est modérateur.
4. **Settings → Variables** (comme les autres fonctions) :

| Variable | Valeur |
|---|---|
| `APPWRITE_API_KEY` | la clé API serveur habituelle (databases.read + databases.write) |
| `DATABASE_ID` | l'ID de ta base |
| `COLLECTION_USERS` | l'ID de la collection des utilisateurs |
| `COLLECTION_UAC_NEWS` | `uac_news` |
| `COLLECTION_UAC_RESTAURANTS` | `uac_restaurants` |

5. Déploie, puis note l'**ID de la fonction** (Settings → Function ID).

## 3. Variables Netlify

Site settings → Environment variables, puis redéploie le site :

| Variable | Valeur |
|---|---|
| `VITE_APPWRITE_COLLECTION_UAC_NEWS` | `uac_news` |
| `VITE_APPWRITE_COLLECTION_UAC_RESTAURANTS` | `uac_restaurants` |
| `VITE_APPWRITE_FUNCTION_MANAGE_UAC` | l'ID de la fonction `manage-uac` |

## 4. Remplir le menu et tester

1. Connecté en modérateur : **Console → UAC → Ajouter un restaurant**.
2. Nom, lieu, puis le plat de chaque repas (matin, midi, soir) pour chacun des 7 jours. **Pas de prix.** Le menu se répète chaque semaine : tu n'y reviens que s'il change.
3. Ouvre **Ça parle**, glisse vers l'onglet **UAC** : le bandeau « Au menu aujourd'hui » montre le jour d'aujourd'hui (heure du Bénin), avec le repas du moment en surbrillance. Un restaurant sans aucun plat aujourd'hui n'apparaît pas.
4. Clique sur **Publier** pour tester une actualité ; elle apparaît tout de suite. Dans la Console → UAC, tu peux la masquer ou la supprimer.

## Règles en place
- Tout utilisateur connecté et non banni peut publier ; **5 actualités par jour** au maximum et par personne.
- Un auteur supprime ses propres actualités ; un modérateur supprime ou masque n'importe laquelle.
- Au maximum 5 restaurants (l'éditeur n'en propose pas plus).

## Pas encore fait
La **carte du campus** (étape 2) et le **guide de l'UAC** (étape 4).
