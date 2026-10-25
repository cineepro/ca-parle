import assert from 'node:assert/strict';
import { extractQueryWords, rankDocuments, buildSnippet, freshnessMultiplier, wordVariants } from '../src/ranking.js';
import { cleanSource, parseBulk } from '../../manage-search-sources/src/validate.js';

assert.deepEqual(extractQueryWords("Comment s'inscrire à l'Université d'Abomey-Calavi ?"), ['inscrire','universite','abomey','calavi']);
assert.deepEqual(wordVariants('bourses'), ['bourses','bourse']);
const now = Date.parse('2026-10-23');
const d = (o) => ({ host:'a.bj', title:'', description:'', content:'', trust:1, ...o });
const docs = [
  d({ $id:'1', host:'uac.bj', title:'Inscriptions à l’UAC 2026', content:'Les inscriptions sont ouvertes à la faculté. inscriptions inscriptions', trust:3, publishedAt:'2026-10-20' }),
  d({ $id:'2', host:'blog.bj', title:'Mon voyage', content:'inscription rapide sur un site', trust:1 }),
  d({ $id:'3', host:'uac.bj', title:'Inscriptions master', content:'inscriptions master', trust:3 }),
  d({ $id:'4', host:'uac.bj', title:'Inscriptions licence', content:'inscriptions licence', trust:3 }),
  d({ $id:'5', host:'x.bj', title:'Rien', content:'football' }),
];
const r = rankDocuments(docs, ['inscriptions'], { now });
assert.equal(r[0].doc.$id, '1');                       // titre + confiance + fraîcheur
assert.ok(!r.find(x => x.doc.$id === '5'));            // non pertinent exclu
const top3 = r.slice(0,3).map(x=>x.doc.host);
assert.ok(top3.filter(h=>h==='uac.bj').length <= 2);   // diversité par site
assert.ok(r.find(x=>x.doc.$id==='2'));                 // singulier trouvé via variante
assert.equal(freshnessMultiplier('2026-10-20', now), 1.25);
assert.ok(buildSnippet(docs[0], ['inscriptions']).includes('inscriptions'));
// ville
const c = rankDocuments([d({$id:'a',host:'h1',title:'bourse',city:'Parakou'}), d({$id:'b',host:'h2',title:'bourse',city:'Cotonou'})], ['bourse'], {city:'Cotonou', now});
assert.equal(c[0].doc.$id,'b');
// validation
assert.ok(cleanSource({url:'http://localhost/x'}).error);
assert.ok(cleanSource({url:'http://192.168.1.1'}).error);
assert.ok(cleanSource({url:'ftp://uac.bj'}).error);
const ok = cleanSource({url:'https://www.uac.bj/news#top', category:'etudes', trust:3});
assert.equal(ok.value.url,'https://www.uac.bj/news'); assert.equal(ok.value.trust,3);
assert.equal(cleanSource({url:'https://uac.bj', category:'bidon', trust:9}).value.category,'autre');
assert.equal(parseBulk('# commentaire\n\nhttps://a.bj | A | etudes | Cotonou | 3\nhttps://b.bj').length, 2);
console.log('classement + validation : OK');

// ---- v2 : synonymes, accents, fautes, clics
import { buildGroups, buildVocab, correctWords, editDistance, clicksMultiplier, scoreDocument, flattenTerms } from '../src/ranking.js';
import { SYNONYMS } from '../src/synonyms.js';
const vocab = buildVocab(['Inscriptions à l’Université d’Abomey-Calavi', 'Bourses d’études 2026', 'Concours de recrutement']);
assert.ok(vocab.get('universite').spellings.has('université'));
let g = buildGroups(['universite'], { synonyms: SYNONYMS, vocab });
assert.ok(g[0].raw.includes('université'));                       // accent rétabli pour la base
assert.equal(editDistance('inscriptoin', 'inscription'), 1);       // échange de lettres = 1 faute
assert.deepEqual(correctWords(['inscriptoin'], vocab), { words: ['inscriptions'], changed: true });
assert.deepEqual(correctWords(['bourse'], vocab).changed, false);   // pluriel connu : pas de correction
assert.equal(correctWords(['xyzxyz'], vocab).changed, false);
// synonymes : « recrutement » trouve une page qui dit « concours »
const sdoc = { $id: 's', host: 'h', title: 'Concours de la police', content: '', trust: 1 };
const gs = buildGroups(['recrutement'], { synonyms: SYNONYMS });
assert.ok(scoreDocument(sdoc, gs, { now }) > 0);
assert.ok(scoreDocument(sdoc, gs, { now }) < scoreDocument({ ...sdoc, title: 'Recrutement de la police' }, gs, { now }));
// clics : plafonné
assert.equal(clicksMultiplier(0), 1); assert.ok(clicksMultiplier(5) > 1); assert.ok(clicksMultiplier(1e9) <= 1.3 + 1e-9);
assert.ok(flattenTerms(g).includes('universite'));
console.log('classement v2 : OK');
