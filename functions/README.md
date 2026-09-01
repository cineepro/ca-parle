# Ça Parle — Déploiement des Appwrite Functions

Runtime recommandé : **Node.js 18** (ou plus récent disponible dans ta console).

Pour chaque function, la démarche est la même :

1. Créer la function dans Appwrite Console → Functions → Create Function (ou via `appwrite functions create` en CLI)
2. Uploader/déployer le contenu du dossier correspondant (`package.json` + `src/main.js`)
3. Renseigner l'**entrypoint** : `src/main.js`
4. Renseigner les **variables d'environnement** (secrets, jamais commitées)
5. Configurer le **déclencheur** (événement DB ou exécution manuelle/HTTP)
6. Configurer les **permissions d'exécution**

---

## Variable d'environnement commune à TOUTES les functions

| Variable | Valeur |
|---|---|
| `APPWRITE_API_KEY` | Clé API serveur avec scopes `databases.read` + `databases.write` (Console → Overview → API Keys → Create API Key). **Secret, jamais dans le `.env` du front.** |
| `DATABASE_ID` | Le même ID que `VITE_APPWRITE_DATABASE_ID` du front |

`APPWRITE_FUNCTION_API_ENDPOINT` et `APPWRITE_FUNCTION_PROJECT_ID` sont injectées **automatiquement** par Appwrite, pas besoin de les définir.

---

## 1. `on-story-created`

- **Déclencheur** : Events → `databases.*.collections.<ID_COLLECTION_STORIES>.documents.*.create`
- **Permissions d'exécution** : aucune (déclenché par événement, pas par un utilisateur)
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `COLLECTION_BADGES`
  - `COLLECTION_USER_BADGES`
  - `COLLECTION_NOTIFICATIONS`

## 2. `on-comment-created`

- **Déclencheur** : Events → `databases.*.collections.<ID_COLLECTION_COMMENTS>.documents.*.create`
- **Permissions d'exécution** : aucune
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `COLLECTION_STORIES`
  - `COLLECTION_COMMENTS`
  - `COLLECTION_BADGES`
  - `COLLECTION_USER_BADGES`
  - `COLLECTION_NOTIFICATIONS`

## 3. `on-reaction-write`

- **Déclencheur** : Events → ajouter les **3** événements suivants sur la même function :
  - `databases.*.collections.<ID_COLLECTION_REACTIONS>.documents.*.create`
  - `databases.*.collections.<ID_COLLECTION_REACTIONS>.documents.*.update`
  - `databases.*.collections.<ID_COLLECTION_REACTIONS>.documents.*.delete`
- **Permissions d'exécution** : aucune
- **Variables supplémentaires** :
  - `COLLECTION_STORIES`
  - `COLLECTION_REACTIONS`

## 4. `resolve-prediction` (HTTP, appelée par le client)

- **Déclencheur** : aucun événement — reste appelable manuellement/HTTP uniquement
- **Permissions d'exécution** : `users` (tout utilisateur connecté peut *appeler* la function — l'autorisation fine, "est-ce l'auteur de l'histoire ou un modérateur", est vérifiée **à l'intérieur** de la function via `x-appwrite-user-id`)
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `COLLECTION_STORIES`
  - `COLLECTION_PREDICTIONS`
  - `COLLECTION_PREDICTION_VOTES`
  - `COLLECTION_BADGES`
  - `COLLECTION_USER_BADGES`
  - `COLLECTION_NOTIFICATIONS`

## 5. `moderate-content` (HTTP, appelée par le client)

- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `users` (la vérification réelle `isModerator === true` se fait à l'intérieur — voir section sécurité ci-dessous)
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `COLLECTION_STORIES`
  - `COLLECTION_COMMENTS`
  - `COLLECTION_REPORTS`

## 6. `increment-view` (HTTP, appelée par le client)

- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `any` (même un visiteur non connecté peut compter une vue) ou `users` si tu préfères réserver ça aux comptes connectés
- **Variables supplémentaires** :
  - `COLLECTION_STORIES`

## 7. `start-conversation` (HTTP, appelée par le client)

- **Pourquoi elle existe** : Appwrite interdit à un client d'accorder une permission de lecture à un autre utilisateur que lui-même. Une conversation à deux doit pourtant être lisible par les DEUX participants — impossible à faire directement depuis le navigateur, d'où cette Function qui pose les permissions avec la clé API serveur.
- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `users`
- **Variables supplémentaires** :
  - `COLLECTION_CONVERSATIONS`

## 8. `send-message` (HTTP, appelée par le client)

- **Pourquoi elle existe** : même raison que `start-conversation` — un message doit être lisible par tous les participants, pas seulement par son expéditeur.
- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `users` (la vérification "l'appelant fait bien partie de cette conversation" se fait à l'intérieur, via `x-appwrite-user-id`)
- **Variables supplémentaires** :
  - `COLLECTION_CONVERSATIONS`
  - `COLLECTION_MESSAGES`
  - `COLLECTION_NOTIFICATIONS`

## 9. `send-newsletter` (HTTP, appelée par le client)

- **Pourquoi elle existe** : envoie un email à tous les utilisateurs abonnés depuis un serveur, avec une clé API Resend qui ne doit jamais être exposée côté client.
- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `users` (la vérification `isModerator === true` se fait à l'intérieur, via `x-appwrite-user-id`)
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `RESEND_API_KEY` — clé API de ton compte Resend
  - `FROM_EMAIL` — ex. `"Ça Parle <news@news.kinemaplus.com>"` (le sous-domaine doit être vérifié sur Resend, voir la config DNS)
  - `APP_URL` — ex. `https://kinemaplus.com`
  - `UNSUB_SECRET` — chaîne aléatoire longue générée une fois (ex. `openssl rand -hex 32`), à réutiliser identique dans `unsubscribe-newsletter`

## 10. `unsubscribe-newsletter` (HTTP, appelée par le client)

- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `any` (accessible sans connexion, cliqué depuis un email)
- **Variables supplémentaires** :
  - `COLLECTION_USERS`
  - `UNSUB_SECRET` — **exactement la même valeur** que dans `send-newsletter`, sinon les liens de désabonnement ne seront jamais valides

---

## 11. Vanessa (IA de Ça Parle) — 4 Functions

Nécessite en plus, sur les 3 premières : un compte OpenAI avec accès à
`gpt-5.6-luna`, et d'avoir exécuté `scripts/setupVanessa.mjs` au préalable
pour obtenir `VANESSA_USER_ID`.

### 11.1 `send-message` (déjà existante — étendue une seconde fois pour le vocal)

Ajoute ces 3 variables supplémentaires (en plus de celles déjà listées) :
- `BUCKET_VOICE_MESSAGES` — ID du bucket Storage des messages vocaux
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` — l'ID de la voix ElevenLabs à utiliser pour Vanessa (Dashboard ElevenLabs → Voices → copie l'ID d'une voix qui te plaît)

### 11.2 `vanessa-daily-post`

- **Déclencheur** : **Schedule (CRON)**, ex. `0 8 * * *` (8h chaque jour, heure du serveur — vérifie le fuseau horaire dans les réglages de la Function)
- **Permissions d'exécution** : aucune (jamais appelée par un utilisateur)
- **Variables** : `APPWRITE_API_KEY`, `DATABASE_ID`, `COLLECTION_STORIES`, `COLLECTION_VANESSA_KNOWLEDGE`, `VANESSA_USER_ID`, `OPENAI_API_KEY`

### 11.3 `vanessa-checkin`

- **Déclencheur** : **Schedule (CRON)**, ex. `0 18 * * *` (18h chaque jour)
- **Permissions d'exécution** : aucune
- **Variables** : `APPWRITE_API_KEY`, `DATABASE_ID`, `COLLECTION_CONVERSATIONS`, `COLLECTION_MESSAGES`, `COLLECTION_NOTIFICATIONS`, `VANESSA_USER_ID`, `OPENAI_API_KEY`

### 11.4 `manage-vanessa-knowledge` (HTTP, appelée par le client)

- **Déclencheur** : aucun événement
- **Permissions d'exécution** : `users` (vérification `isModerator` à l'intérieur)
- **Variables** : `APPWRITE_API_KEY`, `DATABASE_ID`, `COLLECTION_USERS`, `COLLECTION_VANESSA_KNOWLEDGE`

---

## ⚠️ Sécurité : pourquoi `x-appwrite-user-id` est fiable

Quand une Function a la permission d'exécution `users` (ou un rôle spécifique), et que le **client** l'appelle via le SDK Web avec une session active (`functions.createExecution(...)`), Appwrite **injecte automatiquement** l'en-tête `x-appwrite-user-id` dans la requête reçue par la function, avec l'ID de l'utilisateur réellement connecté côté serveur Appwrite. Le client ne peut pas le falsifier — il ne transite jamais par le payload JSON qu'on contrôle.

C'est pour ça que `resolve-prediction` et `moderate-content` vérifient `req.headers['x-appwrite-user-id']` plutôt que de faire confiance à un champ `userId` envoyé dans le corps de la requête.

---

## ⚠️ Permissions Appwrite à resserrer après ce déploiement

Les Functions utilisent la clé API (accès total, elles contournent les permissions de collection). Mais **tant que les permissions de collection actuelles autorisent encore `role:member` (tout utilisateur connecté) à faire un `Update` direct sur `stories`, `users`, `comments`, `badges`, `user_badges`, `predictions`**, un utilisateur techniquement à l'aise peut toujours modifier ces documents directement depuis la console du navigateur, sans passer par les Functions.

Limite importante à connaître : Appwrite n'a **pas de permissions au niveau d'un champ précis**, seulement au niveau du document entier. Donc il n'est pas possible de dire "l'utilisateur peut modifier `bio` mais pas `reputationScore` sur le même document `users`". Deux options réalistes :

1. **Accepter le risque résiduel pour l'instant** (raisonnable pour un lancement à petite échelle entre connaissances) : les Functions garantissent que le *flux normal de l'app* ne peut plus être trafiqué (le client ne calcule et n'envoie plus jamais la valeur finale), mais un utilisateur malveillant avec les DevTools pourrait encore forcer une valeur via une requête PATCH directe à l'API Appwrite s'il a le rôle `Update`.
2. **Verrouillage complet** (recommandé avant une ouverture large) : retirer la permission `Update` pour `role:member` sur `users`, `stories`, `comments`, `badges`, `user_badges`, `predictions`, et créer une Function HTTP dédiée `update-profile` (bio, avatarUrl, phone, defaultAnonymous — les seuls champs qu'un utilisateur doit pouvoir modifier lui-même) ainsi qu'une Function `edit-story`/`edit-comment` si tu veux permettre l'édition de contenu après publication. C'est plus de travail mais c'est la seule façon d'être réellement étanche vu l'absence de permissions par champ dans Appwrite.

Je te recommande l'option 2 si "Ça Parle" doit un jour dépasser un cercle de confiance restreint.
