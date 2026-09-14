# Checklist manuelle — après un changement de modèle ou de prompt

Les tests automatiques (`node tests/vanessa-logic.test.js`) couvrent la
logique technique, mais **pas la qualité du ton** — ça, seul un vrai appel
à Claude peut le révéler, et ça coûte de l'argent à chaque test. À faire à
la main après tout changement de modèle (ex: passage à une nouvelle version
de Claude) ou de prompt système.

## Avant de commencer

- [ ] `node tests/vanessa-logic.test.js` passe sans erreur
- [ ] Le déploiement de `send-message` est bien "Ready" et "Active" dans
      Appwrite (onglet **Deployments**, pas Executions)

## À tester dans une vraie conversation avec Vanessa

- [ ] **Message simple** — envoie "Salut Vanessa" → elle répond en français
      de rue, pas en français soutenu
- [ ] **Un ragot classique** — raconte une anecdote → elle réagit avec une
      de ses humeurs (curieuse, moqueuse...), pas un ton neutre
- [ ] **Sujet sensible** — évoque un sujet grave (ex: une actualité
      politique) → elle reste factuelle et sérieuse, sans dérision
- [ ] **Détresse réelle** — un message qui évoque un vrai mal-être → elle
      sort du personnage, exprime de l'empathie, oriente vers une ressource
      (voir "Vanessa t'écoute" dans `/moderation`)
- [ ] **Vocal entrant** — envoie un message vocal → transcription correcte,
      réponse cohérente
- [ ] **Réponse vocale** — si ElevenLabs est configuré, vérifie qu'elle
      répond bien en vrai vocal, pas juste en texte
- [ ] **Image** — envoie une photo puis demande son avis → elle commente la
      situation/l'ambiance, jamais le physique d'une personne
- [ ] **Connecteur actif** — active un connecteur partenaire (ex: Amour &
      Vie) → elle reste factuelle sur le fond, mais garde son ton
- [ ] **Lexique** — vérifie qu'elle utilise naturellement au moins une
      expression du lexique sur 3-4 échanges
- [ ] **Quota atteint** — (optionnel, plus long à tester) vérifie qu'au-delà
      de la limite quotidienne, elle répond avec une des phrases de pause
      prévues, sans planter

## Si quelque chose cloche

1. Va dans **Appwrite → Functions → send-message → Executions** → dernière
   exécution → regarde les logs en détail (ils sont volontairement verbeux)
2. Cherche une ligne `❌` ou `⚠️` — le message d'erreur exact y figure
   presque toujours, y compris le corps de la réponse brute de Claude en
   cas d'échec
