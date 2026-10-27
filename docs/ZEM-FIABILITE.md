# Zem : prouver que ça marche, rester à jour, mesurer

## 1. Premier essai, dans l'ordre
1. **Tester les sites** : GitHub → onglet *Actions* → « Zem - tester des sites » → *Run workflow*. Aucune clé n'est nécessaire.
   Le résumé de l'exécution donne, pour chaque site de `crawler/sites.candidates.json` : ✅ ok / ⚠️ attention / ⛔ panne, le pourcentage de pages lues avec succès, le nombre de pages gardées et la taille moyenne du texte.
   Les sites ✅ sont listés dans un bloc prêt à coller dans **Console → Zem → Sites → ajouter plusieurs**.
   (Tu peux aussi saisir une ou plusieurs adresses dans le champ « adresses » pour essayer d'autres sites.)
2. Ajoute les sites ✅ dans la Console, puis lance « Robot Zem » (*Run workflow*).
3. **Mesurer la qualité** : « Zem - qualité de la recherche » (*Run workflow*). Le résumé donne le pourcentage de questions dont la bonne page est en 1re place, dans les 3 premières et dans les 10 premières, et la liste des questions ratées.
4. Corrige (synonymes dans `functions/search-engine/src/synonyms.js`, plan du site ou flux RSS d'un site, fiche manuelle), relance le robot, remesure.

Les 50 questions sont dans `crawler/eval/questions.json` : chaque question dit quel site (`hosts`) ou quel mot du titre (`titleAny`) compte comme bonne réponse. Ajuste-les après le premier robot : elles décrivent ce qu'on attend, pas ce qui existe.

## 2. Rester à jour
- Le robot tourne toutes les 6 h (`.github/workflows/zem-robot.yml`).
- Après chaque site, son état commence par « ok », « ⚠️ attention » (structure changée, plus de plan du site, robots.txt qui interdit, nombre de pages en chute) ou « ⛔ panne ».
- Le veilleur (platform-watchdog) crée une alerte dans Console → Alertes pour chaque site ⚠️/⛔, et une alerte « Le robot de Zem ne tourne plus » si aucun site n'a été visité depuis 36 h.
- Le robot respecte robots.txt et espace ses visites.
- La page publique `/zem/a-propos` (lien en bas de Zem) explique tout cela et affiche des chiffres vivants.

## 3. À régler dans Appwrite
| Où | Variable | Valeur |
|---|---|---|
| Function `search-engine` | `COLLECTION_SEARCH_SOURCES` | ID de search_sources (liste publique des sites) |
| Function `search-engine` | `COLLECTION_APP_EVENTS` | ID de la collection des événements (signalements) |
| Function `manage-search-sources` | `COLLECTION_APP_EVENTS` | même ID (lecture des signalements) |
| Function `platform-watchdog` | `COLLECTION_SEARCH_SOURCES` | ID de search_sources |
Puis **redéployer** ces trois Functions. Sans ces variables, tout continue de marcher : la liste des sites, les signalements et la surveillance de Zem sont simplement désactivés.

## 4. Tests automatiques
`.github/workflows/ci.yml` : à chaque envoi sur GitHub, l'application est compilée et tous les tests (Functions, robot, classement, réponse rapide) sont lancés. Une croix rouge = quelque chose est cassé.
