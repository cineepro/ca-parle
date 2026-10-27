import assert from 'node:assert/strict';
import { buildAnswer, splitSentences } from '../src/answer.js';
import { buildGroups, rankDocuments, extractQueryWords } from '../src/ranking.js';
import { SYNONYMS } from '../src/synonyms.js';

assert.equal(splitSentences('Court. Cette phrase est assez longue pour être gardée dans la liste des phrases. Une autre phrase aussi assez longue pour être conservée ici.').length, 2);

const d = (o) => ({ title: '', description: '', content: '', trust: 2, ...o });
const docs = [
    d({ $id: '1', host: 'service-public.bj', title: 'Acte de naissance', content: 'Bienvenue sur le portail des services publics du Bénin. Pour obtenir un acte de naissance, présentez-vous au centre d’état civil de votre arrondissement avec une pièce d’identité. Le délai est de trois jours.', trust: 3 }),
    d({ $id: '2', host: 'gouv.bj', title: 'Démarches', content: 'Le gouvernement publie les démarches. La demande d’acte de naissance se fait aussi en ligne sur le portail, avec un paiement de 1 000 francs.', trust: 3 }),
    d({ $id: '3', host: 'blog.bj', title: 'Voyage', content: 'Un long récit de voyage au bord de la mer, avec des photos magnifiques et des souvenirs de vacances inoubliables. Rien à voir.' }),
];
const words = extractQueryWords('comment obtenir un acte de naissance');
const groups = buildGroups(words, { synonyms: SYNONYMS });
const ranked = rankDocuments(docs, groups);
const a = buildAnswer(ranked, groups);
assert.ok(a, 'une réponse existe');
assert.equal(a.points.length, 2);
assert.match(a.points[0].text, /acte de naissance/);
assert.equal(a.points[0].source.host, 'service-public.bj');
assert.ok(a.points.every((p) => docs.some((x) => x.content.includes(p.text.replace(/…$/, '')))), 'phrases recopiées telles quelles');
assert.equal(buildAnswer([], groups), null);
const none = buildAnswer(rankDocuments([docs[2]], groups), groups);
assert.equal(none, null, 'une page sans le sujet ne produit pas de réponse');
// une seule source par site
const dup = rankDocuments([docs[0], { ...docs[0], $id: '9' }], groups);
assert.equal(buildAnswer(dup, groups).points.length, 1);
console.log('answer : OK');
