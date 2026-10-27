# HALTE — installation (à faire dans cet ordre)

⚠️ Le service reste FERME tant que `HALTE_ENABLED` n'est pas « true ». Teste tout fermé, puis ouvre.

## 1. Collection `halte_alerts` (Appwrite → Databases → ta base)
Attributs (type String sauf mention) :
| Attribut | Taille | Requis | Défaut | Chiffrer* |
|---|---|---|---|---|
| `ref` | 12 | oui | – | |
| `status` | 20 | non | `nouvelle` | |
| `priority` | 10 | non | `normale` | |
| `danger` (Boolean) | – | non | `false` | |
| `forWho` | 10 | non | – | |
| `channel` | 10 | non | `web` | |
| `posterCode` | 40 | non | – | |
| `place` | 300 | non | – | oui |
| `geo` | 60 | non | – | oui |
| `phone` | 30 | non | – | oui |
| `phoneKey` | 8 | non | – | |
| `callOk` (Boolean) | – | non | `false` | |
| `bestTime` | 40 | non | – | |
| `message` | 1000 | non | – | oui |
| `flags` | 100 | non | – | |
| `notes` | 5000 | non | `[]` | oui |
| `assignedTo` | 36 | non | – | |
| `firstActionAt` | 40 | non | – | |
| `deviceHash` | 64 | non | – | |
| `createdAt` | 40 | oui | – | |
| `updatedAt` | 40 | non | – | |
\* « Encrypt » si l'option existe sur ton projet (les attributs chiffrés ne peuvent pas être indexés : aucun de ceux-là ne l'est).

Index (type Key, ordre ASC) : `ref_idx` (**Unique**) sur `ref` · `status_idx` · `createdAt_idx` · `updatedAt_idx` · `phoneKey_idx` · `deviceHash_idx`.
Permissions : **aucune** sur la collection, Document security désactivée (tout passe par la Function).

## 2. Collection `users`
Attribut `isResponder` : Boolean, non requis, défaut `false`, + index `isResponder_idx`. Pour nommer un membre de la cellule d'écoute : mettre `isResponder` à `true` sur son compte.

## 3. Function `halte-alert`
- Dossier `functions/halte-alert`, Node.js (même version que les autres), entrée `src/main.js`, installation `npm install`, timeout 15 s.
- **Execute access : Any** (la page est publique et la passerelle SMS n'a pas de compte). Les actions réservées vérifient le compte elles-mêmes.
- Planification (facultatif) : `0 3 * * *` pour la suppression automatique des alertes closes.
- Clé API de la Function : droits `documents.read` et `documents.write`.
- Variables :
| Variable | Valeur |
|---|---|
| `APPWRITE_API_KEY` | la clé ci-dessus |
| `DATABASE_ID`, `COLLECTION_USERS` | comme les autres Functions |
| `COLLECTION_HALTE_ALERTS` | ID de `halte_alerts` |
| `COLLECTION_NOTIFICATIONS` | ID de la collection des notifications (existante) |
| `HALTE_SALT` | texte aléatoire long (32 caractères ou plus), secret, jamais modifié ensuite |
| `HALTE_ENABLED` | `false` pendant les tests, `true` à l'ouverture |
| `HALTE_RETENTION_DAYS` | durée de conservation des alertes closes (à fixer avec un juriste) |
| `HALTE_SMS_SECRET` | secret partagé avec la passerelle SMS (si SMS) |
| `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `SITE_URL` | mêmes valeurs que `platform-watchdog` (e-mails sans contenu) |

## 4. Netlify
| Variable | Valeur |
|---|---|
| `VITE_APPWRITE_FUNCTION_HALTE_ALERT` | ID de la Function |
| `VITE_HALTE_PUBLIC_URL` | le domaine DÉFINITIF (c'est lui qui sera imprimé dans les QR) |
| `VITE_HALTE_SMS_NUMBER` | numéro qui reçoit les SMS (ex. +229…), laisser vide sans SMS |
| `VITE_HALTE_LOCAL_CONTACTS` | facultatif, JSON : `[{"label":"Guichet unique de protection sociale","number":"…","detail":"…"}]` |
| `VITE_HALTE_EXIT_URL` | facultatif : page neutre du bouton « Quitter vite » |
Puis dans `src/features/halte/config.ts` : appeler chaque numéro, puis renseigner `NUMBERS_VERIFIED_ON`.

## 5. Passerelle SMS (facultatif, pour le QR « sans internet »)
1. Choisir un fournisseur qui sait RECEVOIR des SMS sur un numéro au Bénin (vérifier couverture, coût, numéro local) — ou utiliser le canal SMS gratuit de U-Report en accord avec UNICEF.
2. Lui faire envoyer chaque SMS reçu vers l'adresse publique de la Function `halte-alert` (méthode POST) avec le secret : dans le corps (`secret`), un en-tête `x-halte-secret` ou l'adresse `?secret=…`. Champs reconnus : `from`/`From`/`msisdn` et `text`/`Body`/`message`.
3. Réponse automatique à configurer chez le fournisseur : « Message reçu. Une personne va te rappeler. En danger ? Appelle le 138 ou le 117. »

## 6. Tester fermé, puis ouvrir
1. `HALTE_ENABLED=false` : ouvrir `/halte` → l'envoi répond « service pas encore ouvert » et rappelle les numéros.
2. Passer à `true` ; envoyer une alerte test depuis un téléphone : elle apparaît sur `/halte/cellule` (compte `isResponder`) ; la notification et l'e-mail ne contiennent pas le texte.
3. Couper le réseau du téléphone, envoyer : message « gardé sur ce téléphone » ; rallumer : l'alerte arrive.
4. Envoyer 4 alertes sans danger depuis le même téléphone : les dernières sont en priorité « basse », aucune n'est perdue.
5. Scanner chaque QR (web, SMS, appel) avec un Android ET un iPhone.
6. Faire une répétition complète avec la cellule : alerte → rappel → note → « traitée ». Mesurer le délai.
7. Seulement ensuite : imprimer.
