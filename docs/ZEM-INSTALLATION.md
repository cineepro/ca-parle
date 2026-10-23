# Zem — installation pas à pas

Zem = le moteur de recherche + navigateur local de Vanessa. Il fonctionne en 3 morceaux :

1. **Le robot** (`crawler/`) : tourne tout seul (GitHub Actions, toutes les 6 h), lit les sites que tu as choisis et remplit l'index.
2. **Le moteur** (2 Appwrite Functions) : `search-engine` (recherche) et `manage-search-sources` (gestion des sites, modérateurs seulement).
3. **L'interface** : page `/zem` (entrée « Zem » dans la barre latérale) et section **Console → Zem** pour ajouter les sites.

Ordre à suivre : **A.** collections → **B.** fonctions → **C.** variables Netlify → **D.** robot → **E.** ajouter les sites.

---

## A. Créer 3 collections dans Appwrite (Databases → ta base)

Aucune permission pour les utilisateurs sur ces collections (tout passe par les fonctions et le robot) : laisse « Permissions » vide et « Document security » désactivé.

### 1. `search_sources` — les sites que Zem lit
| Attribut | Type | Taille / valeurs | Requis | Défaut |
|---|---|---|---|---|
| url | String | 500 | oui | — |
| label | String | 100 | non | |
| category | String | 30 | non | autre |
| city | String | 60 | non | |
| trust | Integer | 1 à 3 | non | 2 |
| active | Boolean | | non | true |
| sitemapUrl | String | 500 | non | |
| feedUrl | String | 500 | non | |
| maxPages | Integer | 5 à 300 | non | 40 |
| lastCrawledAt | String | 40 | non | |
| lastStatus | String | 250 | non | |
| pagesCount | Integer | 0 à 1 000 000 | non | 0 |
| createdAt | String | 40 | non | |

Index : `lastCrawledAt` (type **key**, ordre ASC) · `active` (**key**).

### 2. `search_documents` — les pages lues (l'index)
| Attribut | Type | Taille | Requis |
|---|---|---|---|
| url | String | 700 | oui |
| host | String | 120 | non |
| sourceId | String | 40 | non |
| sourceLabel | String | 100 | non |
| title | String | 250 | non |
| description | String | 500 | non |
| content | String | 20000 | non |
| category | String | 30 | non |
| city | String | 60 | non |
| trust | Integer (1 à 3) | | non |
| publishedAt | String | 40 | non |
| crawledAt | String | 40 | non |
| contentHash | String | 40 | non |
| lang | String | 8 | non |

Index (**obligatoires**, sinon la recherche ne marche pas) :
- `title` → type **fulltext**
- `content` → type **fulltext**
- `category` → key · `sourceId` → key · `publishedAt` → key (ordre DESC)

### 3. `search_queries` — ce que les gens cherchent (anonyme)
| Attribut | Type | Taille | Requis |
|---|---|---|---|
| q | String | 120 | non |
| resultsCount | Integer | | non |
| category | String | 30 | non |
| createdAt | String | 40 | non |

Index : `resultsCount` → key.

---

## B. Créer les 2 Functions (comme les autres : Runtime Node, Entrypoint `src/main.js`)

| Function | Dossier du projet | Variables à ajouter |
|---|---|---|
| `search-engine` | `functions/search-engine` | `APPWRITE_API_KEY`, `DATABASE_ID`, `COLLECTION_SEARCH_DOCUMENTS`, `COLLECTION_SEARCH_QUERIES` |
| `manage-search-sources` | `functions/manage-search-sources` | `APPWRITE_API_KEY`, `DATABASE_ID`, `COLLECTION_USERS`, `COLLECTION_SEARCH_SOURCES`, `COLLECTION_SEARCH_DOCUMENTS`, `COLLECTION_SEARCH_QUERIES` |

- `APPWRITE_API_KEY` : la même clé que pour les autres fonctions (droits bases de données lecture/écriture).
- « Execute access » : comme `manage-vanessa-knowledge` (utilisateurs connectés). La fonction `manage-search-sources` vérifie elle-même que l'appelant est modérateur.
- Note l'**ID** de chaque fonction pour l'étape C.

## C. Netlify — 2 variables d'environnement puis redéployer
```
VITE_APPWRITE_FUNCTION_SEARCH_ENGINE=<ID de search-engine>
VITE_APPWRITE_FUNCTION_MANAGE_SEARCH_SOURCES=<ID de manage-search-sources>
```

## D. Le robot (GitHub Actions)

1. Appwrite → Overview → **API keys** → créer une clé `zem-robot` avec seulement `databases.read` et `databases.write`.
2. GitHub → Settings → Secrets and variables → **Actions** → *Secrets* : `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `ZEM_APPWRITE_API_KEY` (la clé ci-dessus), `DATABASE_ID`, `COLLECTION_SEARCH_SOURCES`, `COLLECTION_SEARCH_DOCUMENTS`.
3. *Variables* (facultatif mais recommandé) : `ZEM_USER_AGENT` = `ZemBot/1.0 (+https://TON-DOMAINE/zem-bot)` — c'est la « carte de visite » du robot ; les sites peuvent ainsi savoir qui les visite.
4. Onglet **Actions → Robot Zem → Run workflow** pour le premier passage (ensuite il se lance seul toutes les 6 h). Le journal affiche, site par site, ce qui a été lu.

---

## E. Où et comment ajouter les sites ✅

**Console → Zem → « Ajouter un site »** (réservé aux modérateurs).

| Champ | Quoi mettre | Exemple |
|---|---|---|
| Adresse de départ | La page ou la rubrique à lire. Si tu mets une rubrique (`/news`), le robot reste **dans** cette rubrique. Si tu mets l'accueil, il lit tout le site. | `https://www.uac.bj/news` |
| Nom court | Pour t'y retrouver (affiché sous chaque résultat) | `UAC — actualités` |
| Rubrique | Où le site apparaît dans Zem (Les nouvelles, À l'école, Les papiers, Santé, Boulot, Marché, Culture, Sport, Utile, Autres) | À l'école |
| Ville | Facultatif — donne un petit coup de pouce aux pages de cette ville | Abomey-Calavi |
| Confiance | **3** officiel (université, ministère, mairie) · **2** média connu · **1** blog/forum. Plus c'est haut, plus le site passe devant. | 3 |
| Réglages avancés | Plan du site (`sitemap.xml`) et flux RSS : **laisse vide**, le robot les trouve seul. À remplir seulement s'il ne trouve rien. | |

**Ajouter plusieurs sites d'un coup** : « Ajouter plusieurs sites d'un coup », une ligne par site :
```
https://www.uac.bj/news | UAC — actualités | etudes | Abomey-Calavi | 3
https://www.gouv.bj/actualites | Gouvernement | administration | | 3
```
Rubriques : `actualites, etudes, administration, sante, emploi, marche, culture, sport, services, autre`.

**Pas besoin de « sélecteur CSS »** comme pour les connecteurs : le robot repère tout seul le texte principal de chaque page (il ignore menus et pieds de page).

**Après l'ajout** : le site apparaît dans la liste avec « jamais exploré ». Après le prochain passage du robot (ou « Run workflow »), la ligne affiche le nombre de pages lues et un message d'état. Commence par **2 ou 3 sites**, vérifie que la recherche trouve bien leurs pages, puis ajoute le reste.

**Si un site reste à 0 page**, causes habituelles :
1. Le site interdit les robots (`robots.txt`) → Zem respecte et passe son chemin.
2. Le site s'affiche uniquement par JavaScript (page vide sans JS) → le robot ne l'exécute pas. Parfois un flux RSS règle le cas : le renseigner dans « Réglages avancés ».
3. Les pages ont moins de 200 caractères de texte.
4. Le site était hors service au moment du passage (réessayer).

**Faire le tri** : « Mettre en pause » arrête un site sans rien effacer ; « Retirer » supprime le site **et** ses pages de l'index. La zone « Ce que les gens cherchent sans le trouver » indique quels sites ajouter ensuite.

### Premiers sites (à toi de choisir — je n'ai pas pu les ouvrir depuis mon espace de travail pour vérifier leur contenu)
- Déjà évoqués ensemble : `https://www.uac.bj/news` (À l'école, 3), `https://www.uac.bj/espace-presse/` (À l'école, 3), sites officiels `gouv.bj`, `assemblee-nationale.bj`, `presidence.bj` (Les papiers / Les nouvelles, 3).
- Pour les médias, les concours, la santé, l'emploi : choisis les sites que les Béninois lisent vraiment, vérifie leur `robots.txt` et leurs conditions d'utilisation, puis ajoute-les avec la confiance 2.

---

## Règles de bonne conduite intégrées
- Le robot lit `robots.txt` et s'y conforme, attend 1 s entre deux pages d'un même site, s'identifie (`ZEM_USER_AGENT`).
- Zem ne montre que des **extraits** (≈220 caractères dans la liste, ≈1 500 dans « Lire ici ») et renvoie toujours vers le site d'origine. Si un site demande à être retiré : « Retirer » dans la Console.
- Les recherches sont enregistrées **sans identité**.

## Textes locaux
Toutes les phrases et noms de rubriques sont dans `src/features/moteur/lib/phrases.ts`. Ce sont des **propositions** : à faire relire par des Béninois de plusieurs villes avant le lancement.

## Ce qui n'a pas pu être vérifié ici
- Le robot a été testé sur un faux site local (robots.txt, sitemap, pages vides, 404, limite de pages), **pas sur de vrais sites** (mon espace de travail ne peut pas les joindre).
- Le comportement exact de la recherche texte d'Appwrite sur les accents et les pluriels : les journaux de `search-engine` affichent « 🔎 Zem … candidats » pour t'aider à juger. Si besoin, on passera à un moteur d'index dédié (Meilisearch).
- **Zem comme moteur de recherche du navigateur** (facultatif, à faire une fois le domaine connu) : dans `public/opensearch.xml` remplace `TON-DOMAINE` par ton adresse, puis ajoute dans `index.html`, dans `<head>` : `<link rel="search" type="application/opensearchdescription+xml" title="Zem" href="/opensearch.xml" />`. Je ne l'ai volontairement pas activé : sans la bonne adresse, il proposerait un moteur cassé.
