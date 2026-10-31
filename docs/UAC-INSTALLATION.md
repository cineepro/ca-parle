# Espace UAC — installation pas à pas

L'onglet **UAC** de « Ça parle » (menu du jour, actualités, carte du campus) a besoin de **3 collections**, **1 fonction** et **4 variables Netlify**. Compte 15 minutes.

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

Il crée `uac_restaurants`, `uac_news` et `uac_places` avec leurs attributs et index. Tu peux le relancer sans risque. Si un index échoue (les attributs n'étaient pas encore prêts), relance-le.
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
| `COLLECTION_UAC_PLACES` | `uac_places` |

5. Déploie, puis note l'**ID de la fonction** (Settings → Function ID).

## 3. Variables Netlify

Site settings → Environment variables, puis redéploie le site :

| Variable | Valeur |
|---|---|
| `VITE_APPWRITE_COLLECTION_UAC_NEWS` | `uac_news` |
| `VITE_APPWRITE_COLLECTION_UAC_RESTAURANTS` | `uac_restaurants` |
| `VITE_APPWRITE_COLLECTION_UAC_PLACES` | `uac_places` |
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

## 5. La carte du campus
1. **Collection `uac_places`** (si tu la crées à la main) : Users → Read seulement ; attributs `name` (String 100, requis), `kind` (String 20, requis), `latitude` (Float, -90 à 90, requis), `longitude` (Float, -180 à 180, requis), `description` (String 500), `active` (Boolean, défaut true) ; index `idx_active_kind` (Key, `active` ASC puis `kind` ASC).
2. **Mise à jour de la fonction `get-route`** : redéploie-la (elle sait maintenant calculer un trajet à pied). Elle utilise ta clé `OPENROUTESERVICE_API_KEY` déjà en place.
3. **Remplir les lieux** : Console → UAC → « Lieux du campus ».
   - **Importer depuis OpenStreetMap** : cherche les amphis, banques, commerces, etc. connus autour du campus ; tu coches ceux que tu gardes. OpenStreetMap est souvent incomplet à Abomey-Calavi.
   - **Ajouter par liens Google Maps** : colle ta liste (le nom sur une ligne, son lien Google Maps sur la ligne suivante, 40 lieux d'un coup si tu veux). Le serveur retrouve les coordonnées ; tu vérifies les noms et les types, et tu enregistres. Les lieux qui ressemblent à un lieu déjà enregistré sont décochés avec un avertissement. Si un lien est illisible, mets à la place les coordonnées sous le nom (« 6.41234, 2.33987 » : clic droit sur l'épingle dans Google Maps, puis clique sur les chiffres pour les copier). **Réglage conseillé :** dans la fonction `manage-uac` → Settings → **Timeout**, mets 60 secondes.
   - **+ Ajouter un lieu** : nom, type, puis touche la carte à l'endroit exact.
4. **Centre de la carte** : le point d'ouverture est dans `src/features/uac/config.ts` (`CAMPUS_CENTER`, en [longitude, latitude]). C'est une valeur approximative : ajuste-la si la carte s'ouvre à côté du campus.
5. Dans l'onglet UAC, le bouton **Carte du campus** ouvre la carte : recherche, filtres par type, et **Y aller** (trajet à pied depuis la position de l'étudiant, ou en voiture s'il est à plus de 6 km).

## Pas encore fait
Le **guide de l'UAC** (étape 4).
