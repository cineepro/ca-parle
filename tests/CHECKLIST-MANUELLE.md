# Checklist manuelle — Ça Parle

Complète `tests/vanessa-logic.test.js`, qui ne teste que deux bouts de logique
technique pure. Tout le reste — le ton, le comportement réel, les
fonctionnalités qui s'enchaînent correctement — ne peut être vérifié qu'à la
main, en utilisant vraiment l'app. C'est l'objet de ce document.

**Comment s'en servir** : coche au fur et à mesure, avec un vrai compte
(pas seulement ton compte modérateur — certains bugs ne se voient que côté
utilisateur normal). Note la date de ton dernier passage complet en bas de
ce fichier.

---

## 1. Comptes et accès

- [ ] Inscription avec un nouvel email → email de confirmation reçu, lien fonctionnel
- [ ] Connexion / déconnexion
- [ ] Mot de passe oublié → email reçu, réinitialisation fonctionne
- [ ] Bandeau de rappel du téléphone (si numéro absent) s'affiche puis disparaît une fois renseigné
- [ ] Sur Android : demande de permission de localisation apparaît bien à l'ouverture

## 2. Histoires (le cœur de Ça Parle)

- [ ] Publier une histoire, avec et sans anonymat
- [ ] Les 4 types (Ragot, Révélation, Témoignage, Rumeur) s'affichent correctement
- [ ] Réactions 🔥😂😲 — une seule active à la fois, bascule bien
- [ ] Votes 💯🤔❌ — idem
- [ ] Commenter une histoire
- [ ] Lancer une prédiction, voter, la résoudre → réputation/fiabilité mise à jour
- [ ] Rattacher une histoire à une fiche référence, consulter la fiche
- [ ] Signaler un contenu → apparaît bien dans `/moderation`
- [ ] Rechercher une histoire, une personne

## 3. Réputation et badges

- [ ] Le score de réputation augmente après publication/commentaire
- [ ] **Vérifier que la collection `badges` contient bien 6 documents** (sinon, relancer `scripts/seedBadges.mjs` — voir historique, c'est déjà arrivé une fois)
- [ ] Publier assez pour débloquer au moins un badge, vérifier qu'il apparaît sur le profil
- [ ] Vérifier la notification reçue au déblocage d'un badge

## 4. Vanessa — conversation générale

- [ ] Lui écrire en texte → réponse dans le bon ton, courte (2-4 phrases), pas de liste à puces
- [ ] Message vocal → transcription correcte, réponse vocale reçue
- [ ] Envoyer une image seule → aucune réponse automatique
- [ ] Envoyer une image puis un message → elle commente la situation/l'ambiance, **jamais le physique**
- [ ] Lui demander "comment tu fonctionnes ?" → reste courte et naturelle, ne récite pas une documentation
- [ ] Lui demander de rédiger un post pour les réseaux → le fait dans son style, sans s'excuser
- [ ] Bouton "✍️ Demande-lui de rédiger quelque chose" visible en tout début de conversation, pré-remplit le champ
- [ ] Raconter une bonne histoire → elle peut proposer `[[SUGGESTION_POST]]`, le bouton de publication fonctionne
- [ ] Lui reparler d'un sujet évoqué il y a plusieurs jours → elle s'en souvient si c'est pertinent
- [ ] Consulter et effacer sa mémoire depuis le profil
- [ ] Atteindre le quota quotidien de tokens → message pré-écrit, pas d'appel payant inutile
- [ ] Message évoquant une vraie détresse → bascule immédiate en mode sérieux, ressource orientée si disponible

## 5. Vanessa — connecteurs partenaires

- [ ] Les pastilles de connecteurs actifs s'affichent en haut du chat, avec le badge de questions du mois
- [ ] Activer un connecteur → elle applique le ton habituel + le fond du partenaire
- [ ] Désactiver un connecteur depuis `/moderation` → disparaît des pastilles, conversation en cours retombe proprement en général
- [ ] Épuiser le quota de tokens d'un connecteur → devient indisponible ; recharger en FCFA depuis la modération → redevient utilisable
- [ ] Une note catégorie `publicite` sur un connecteur → citée avec le préfixe `PUB :` en fin de message
- [ ] Espace partenaire (`/espace-partenaire`) → un compte lié à un connecteur voit sa propre consommation, jamais celle des autres
- [ ] Ajouter un lien (site/RSS) à un connecteur → `sync-connector-sources` propose des notes désactivées, à valider

## 6. Vanessa — connaissances et pertinence

- [ ] Ajouter/modifier/désactiver une note générale depuis `/moderation`
- [ ] Poser une question précise avec beaucoup de notes en base → elle pioche les pertinentes, pas juste les dernières ajoutées
- [ ] Demander un bon plan → cite une vraie fiche Ça sert confirmée, ou dit honnêtement qu'elle n'a rien de vérifié
- [ ] Profil → "💡 Proposer une expression" → apparaît désactivée dans `/moderation → Connaissances`, l'activer la rend utilisable
- [ ] Mettre un 👍 ou 👎 sur une réponse → apparaît dans l'onglet "Avis sur Vanessa"

## 7. Ça sert

- [ ] La page s'ouvre par défaut en mode carte (globe qui tourne), bascule liste fonctionne
- [ ] "Découvrir la carte" → zoom fluide vers la carte plate, bâtiments en 3D visibles en zoomant sur un point
- [ ] Ajouter un lieu : sélecteur de position fonctionne (tap manuel + "Me localiser ici"), recentrage automatique selon le pays choisi
- [ ] Publication → statut "en attente" dans "Mes contributions", invisible publiquement
- [ ] Validation en modération → devient visible sur la carte publique
- [ ] Bouton "Confirmé" sur une fiche, compteur qui monte
- [ ] Ticker des prix — mode statique si peu d'entrées, défilement fluide au-delà de 4
- [ ] Cliquer un point → fiche + bouton itinéraire
- [ ] Itinéraire : demande de localisation, tracé réel affiché, distance/durée correctes
- [ ] Suivi en direct — le point bleu bouge réellement en se déplaçant
- [ ] Fermer la fiche du lieu ne fait plus disparaître le tracé de l'itinéraire

## 8. Modération (`/moderation`)

- [ ] Les 6 onglets s'affichent et chargent (Signalements, Ça sert, Avis sur Vanessa, Newsletter, Connecteurs, Connaissances)
- [ ] Traiter un signalement
- [ ] Valider/refuser une contribution Ça sert
- [ ] Créer/modifier/désactiver un connecteur, éditer son lien et son compte partenaire à tout moment
- [ ] Composer et envoyer une newsletter

## 9. Notifications et newsletter

- [ ] Notification reçue pour une réaction, un commentaire, un message
- [ ] Aucune notification générée par les réponses de Vanessa elle-même
- [ ] Notification push native reçue sur téléphone (app fermée)
- [ ] Inscription/désinscription newsletter fonctionne, lien de désinscription valide

## 10. Documents publics

- [ ] `/documentation` reflète bien toutes les fonctionnalités actuelles (Vanessa, Ça sert...)
- [ ] `/privacy` mentionne la géolocalisation et la mémoire de Vanessa
- [ ] `/terms` couvre Ça sert (responsabilité des informations publiées)

## 11. Vanessa API (produit séparé, developers.kinemaplus.com)

- [ ] Inscription développeur, demande de clé
- [ ] Approbation/refus côté admin
- [ ] Appel API réel avec la clé → réponse cohérente, ton respecté
- [ ] Champ `context` pris en compte
- [ ] Limite de débit (20 req/min) respectée
- [ ] Page de statut public à jour

---

## Historique des passages complets

| Date | Fait par | Notes |
|---|---|---|
| | | |
