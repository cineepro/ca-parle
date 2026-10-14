# Recherche d'utilisateurs dans la Console

Copiez les 4 fichiers de ce dossier à leur place dans le projet (mêmes chemins), puis :

1. **Front** : `git add . && git commit && git push` -> Netlify reconstruit. Rien à ajouter côté Netlify.
2. **Function `platform-overview`** : redéployez-la (le fichier `functions/platform-overview/src/main.js` a changé). Aucune nouvelle Function, aucune nouvelle variable.
3. **Clé API de platform-overview** : ajoutez l'autorisation **users.read** (en plus de databases.read, functions.read, executions.read).
   - Avec elle : recherche par nom, e-mail, téléphone ou ID, sans créer d'index, et « dernière connexion » affichée.
   - Sans elle : la page marche quand même (nom, e-mail exact, ID), avec un avertissement jaune. Un index « key » sur `email` dans la collection users aide alors pour la recherche par e-mail.

Utilisation : Console > Communication > Utilisateurs. Rien ne se charge à l'ouverture ; on tape 2 caractères minimum et on valide.
Coût d'une recherche : 1 requête + 10 lectures au plus. Ouvrir une fiche : 2 lectures.
