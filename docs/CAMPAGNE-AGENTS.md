# Propositions des utilisateurs et agents commerciaux — installation

## 1. Collection `vanessa_suggestions` (Vanessa ne la lit jamais)
Attributs : `content` String 2000 (requis) · `submittedBy` String 36 (requis) · `submitterName` String 100 · `status` String 20 (défaut `nouvelle`) · `createdAt` String 40 (requis).
Index (key) : `submittedBy`, `createdAt`, `status`.
Permissions de la collection : **aucune** (tout passe par la Function). Document security désactivée.

## 2. Collection `agent_registrations`
Attributs : `agentId` String 36 (requis) · `userId` String 36 (requis) · `registeredAt` String 40 (requis).
Index (key) : `agentId`, `registeredAt`. Aucune permission de collection.
(L'identifiant de chaque document est celui du compte inscrit : un compte ne peut appartenir qu'à un seul agent.)

## 3. Attribut `isAgent` dans `users`
Boolean, non requis, défaut `false`, plus un index key. Pour nommer un agent : mettre `isAgent` à `true` sur son compte.

## 4. Function `manage-community`
Dossier `functions/manage-community`, Node, entrée `src/main.js`, **Execute access : Users**.
Variables : `APPWRITE_API_KEY` (documents.read + documents.write), `DATABASE_ID`, `COLLECTION_USERS`, `COLLECTION_SUGGESTIONS` (ID de vanessa_suggestions), `COLLECTION_AGENT_REGISTRATIONS`.

## 5. Netlify
`VITE_APPWRITE_FUNCTION_MANAGE_COMMUNITY` = ID de la Function. Redéployer.

## 6. Redéployer `manage-vanessa-knowledge`
Elle refuse désormais `suggest_expression` (les propositions ne vont plus dans le lexique).

## Utilisation
- Utilisateurs : bouton « Proposer une expression à Vanessa » (jusqu'à 2000 caractères, 20 propositions par jour au maximum).
- Équipe : Console → Propositions (copier, marquer lue/traitée, supprimer) et Console → Agents (suivi par agent).
- Agent : menu « Mon suivi #construisonsVanessa » (page `/agent`).
