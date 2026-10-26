# Photo de profil et compte certifié — installation

## 1. Bucket des photos (Storage)
Nom : `avatars`. Réglages : Create = **Users**, **File security activée**, taille max 2 Mo, extensions jpg, jpeg, png, webp. Copier son ID.

## 2. Attribut `isCertified` (collection users)
Boolean, non requis, valeur par défaut `false`. Ajouter ensuite un index (clé `isCertified_idx`, type key).

## 3. Function `manage-profile`
Dossier `functions/manage-profile`, runtime Node, point d'entrée `src/main.js`, **Execute access : Users** (comme manage-vanessa-knowledge).
Variables : `APPWRITE_API_KEY` (documents.read, documents.write, files.read, files.write), `DATABASE_ID`, `COLLECTION_USERS`, `BUCKET_AVATARS`, et au besoin `PUBLIC_APPWRITE_ENDPOINT` (ex. `https://nyc.cloud.appwrite.io/v1`).

## 4. Netlify
`VITE_APPWRITE_BUCKET_AVATARS` = ID du bucket, `VITE_APPWRITE_FUNCTION_MANAGE_PROFILE` = ID de la Function. Redéployer.

## 5. Redéployer `platform-overview` (il renvoie maintenant `isCertified`).

## Certifier un compte
Console → Utilisateurs → chercher la personne → ouvrir sa fiche → bouton **Certifier** / **Retirer le badge**.
