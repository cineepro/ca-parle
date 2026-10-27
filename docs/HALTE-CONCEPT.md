# HALTE — un signalement simple, sûr et de confiance (note de concept)

Projet « Halte aux violences sexuelles et sexistes à Sèmè-Podji » — U-Report by UNICEF Sèmè-Podji × Vanessa (ASILLIA)

## 1. L'idée en une phrase
Un QR code affiché partout permet à une personne, en moins d'une minute et sans compte, de dire « j'ai besoin d'aide » à une cellule d'écoute formée, qui la rappelle. Si elle n'a pas internet, le même QR (ou l'affiche) la fait appeler ou envoyer un SMS.

## 2. Ce qui est construit (prototype fonctionnel)
- Une page publique (`/halte`) : numéros d'urgence tout en haut, « Quitter vite » toujours visible, 4 questions courtes, aucune obligation de donner son nom.
- Une réception sécurisée côté serveur, avec tri et protection contre les fausses alertes.
- Un espace pour la cellule d'écoute (`/halte/cellule`) : alertes classées par urgence, appel en un geste, statuts, notes, historique de qui a lu quoi.
- Une section Console : chiffres seulement (aucune donnée personnelle), et générateur de QR et d'affiches A4 avec un code par lieu.
- Réception de SMS d'alerte (passerelle SMS à choisir).
- Alertes par notification et e-mail à la cellule — sans jamais envoyer le contenu.
**Rien n'est ouvert au public tant que le service n'est pas activé** (variable `HALTE_ENABLED`).

## 3. Le parcours, selon la situation
| Situation | Ce qui marche |
|---|---|
| Téléphone avec internet | QR « Écrire en ligne » → formulaire court → référence donnée (HV-XXXXXX) |
| Téléphone sans internet | QR « SMS » → un SMS « HALTE EKPE-03 » est prêt, il suffit d'envoyer. QR « Appel » → compose le 138. Les deux fonctionnent sans connexion de données. |
| Connexion qui coupe en plein envoi | Le message est gardé sur le téléphone et part tout seul au retour du réseau |
| Page déjà ouverte une fois | Elle se rouvre sans connexion (copie gardée) |
| Ne sait pas écrire ou n'ose pas | Gros bouton « Parler » : message vocal de 2 minutes au plus (lieu, histoire, numéro dits à voix haute). Le fichier est rangé dans un espace privé, écouté seulement par la cellule, chaque écoute est enregistrée, supprimé avec la fiche. |
| Pas de téléphone | Affiche avec les numéros écrits en clair ; relais humains (scouts, U-Reporters formés) qui peuvent déposer un message pour quelqu'un |
| Danger immédiat | La page met d'abord les boutons d'appel (138, 117) : un formulaire ne remplace jamais un appel |

Pourquoi pas « le QR envoie tout seul la position » ? Scanner un QR ne donne jamais la position : il ouvre un lien. La position ne peut être envoyée que si la personne l'accepte (bouton) — et pour une personne en détresse, taper quelques lettres est plus fiable qu'un GPS refusé. Le formulaire propose donc le lieu en texte ET la position en un bouton.

## 4. Les fausses alertes : comment s'en protéger sans bloquer les vraies
Principe : **on ne refuse jamais une personne qui demande de l'aide.** Une victime qui se voit refuser un envoi ne reviendra pas. On trie, on ne bloque pas.
- Danger immédiat : toujours classé « urgent », jamais limité.
- Un même numéro qui renvoie : la fiche existante est complétée (pas de doublon).
- Rafale depuis un même téléphone : conservée, mais en priorité basse et signalée à la personne qui rappelle.
- Robots : un champ invisible et la vitesse de remplissage ; seul un robot évident est écarté.
- **La vraie vérification est humaine** : la cellule rappelle. Un signal (« rafale », « formulaire rempli très vite ») n'est jamais une preuve ; on classe « sans suite » avec une note, jamais une sanction envers l'auteur de l'alerte.
- Aucune alerte n'est transmise à la police ni attribuée à un accusé sans contact et évaluation par la cellule.
- Message d'honnêteté sur les affiches : « Signaler à tort peut retarder l'aide à quelqu'un qui en a besoin » (à valider avec les partenaires — ton à choisir avec soin pour ne pas faire peur aux vraies victimes).

## 5. Qui reçoit les alertes — la condition numéro 1
Une alerte que personne ne lit est pire que pas d'alerte. **Ne pas lancer sans** :
1. une cellule d'écoute nommée (au moins 3 personnes pour couvrir jours, soirs, week-ends), formée à l'accueil d'une victime mineure, avec un téléphone dédié ;
2. un protocole écrit : délai maximal de premier rappel (objectif : moins d'1 h, urgent : immédiat), qui prévient qui (Centre de promotion sociale, médecin, Brigade de protection des mineurs, police) et quand ;
3. un accord écrit des structures partenaires (UNICEF/U-Report, direction départementale de la famille, Guichet unique de protection sociale, mairie) sur ce que chacune fait ;
4. le respect de l'obligation légale de signaler les violences sur mineurs : les intervenants doivent connaître leurs obligations et les limites de la confidentialité promise.
Le tableau de la Console affiche le nombre d'alertes « sans réponse depuis plus d'1 h » : c'est l'indicateur à surveiller en priorité.

## 6. Protection de la personne et de ses données
- Collecte minimale : pas de nom exigé, pas de photo, pas de récit détaillé demandé (on ne fait pas raconter deux fois une victime : c'est la cellule qui pose les questions).
- Contenu de l'alerte jamais envoyé par e-mail ni notification : seulement « nouvelle alerte, référence X ».
- Chaque lecture d'une fiche est enregistrée (qui, quand). Les modérateurs voient des chiffres, pas les alertes.
- Suppression automatique des alertes closes après une durée à fixer avec un juriste (`HALTE_RETENTION_DAYS`).
- Données très sensibles (mineurs, violences) : à déclarer à l'autorité de protection des données du Bénin (APDP) et à faire relire par un juriste avant lancement. Je ne suis pas juriste : ce point n'est pas fait.
- Téléphone possiblement surveillé : bouton « Quitter vite », pas de compte, aucun titre alarmant dans l'adresse de la page. Il reste la trace dans l'historique du navigateur : les affiches doivent le dire et conseiller de l'effacer.
- Ne jamais promettre « 100 % anonyme » : on peut promettre que le message n'est lu que par la cellule.

## 7. Le rôle de Vanessa
Vanessa est la porte d'entrée familière, pas la personne qui répond. Sur la page, il est dit clairement que ce sont de vraies personnes qui lisent. Une IA ne doit jamais recevoir seule le récit d'une violence. Étape suivante possible : si quelqu'un parle de violence dans le chat de Vanessa, elle affiche le lien et les numéros (sans poser de questions), après tests prudents.

## 8. Mesurer le succès (et passer à l'échelle)
Indicateurs : alertes reçues, délai médian de premier rappel, part d'alertes traitées, quelle affiche a servi, canal (web / SMS), taux d'alertes « sans suite ».
Pilote : Ekpè (événement de novembre 2026), un code par lieu d'affichage. Puis : autres arrondissements et communes, langues locales (fon, yoruba), lien avec la ligne 138 et U-Report (même cellule, même suivi), USSD, tableau de bord pour la direction départementale. Le passage à l'échelle nationale suppose un partenaire institutionnel porteur : le prototype est conçu pour qu'il n'ait qu'à changer la liste de ses intervenants.

## 9. À corriger dans le document de projet
- La date de l'événement : « 25 novembre 2026 » (§1, §11) et « 28 novembre 2026 » (§6) ne concordent pas.
- Budget : la ligne « Impression d'affiches papier A3/A4 » affiche « 100 0000 » (probablement 10 000 : le sous-total de 565 000 F ne tient qu'avec 10 000).
- À ajouter au budget : impression des affiches/QR (une série par lieu), un numéro pour les SMS (abonnement passerelle), la formation de la cellule d'écoute.
