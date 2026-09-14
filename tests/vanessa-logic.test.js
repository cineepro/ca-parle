// tests/vanessa-logic.test.js — Ça Parle
//
// ⚠️ POURQUOI CE FICHIER EXISTE : deux bugs silencieux (le bloc "thinking"
// de claude-sonnet-5, puis le paramètre `temperature` déprécié) ont chacun
// cassé Vanessa en production sans qu'aucune erreur ne soit visible avant
// qu'un utilisateur tombe dessus. Ce fichier teste la logique PURE (sans
// appel réseau, donc gratuit et instantané) qui a déjà été la source de
// ces régressions — à relancer après CHAQUE changement de modèle, de
// prompt, ou de logique de conversation, avant de déployer.
//
// Ne teste PAS la qualité du ton (impossible sans appeler la vraie API) —
// voir CHECKLIST-MANUELLE.md pour ça.
//
// Lancer : node tests/vanessa-logic.test.js
import assert from 'node:assert';

// --- Fonctions dupliquées ici depuis les Functions concernées, car les
// Appwrite Functions ne partagent pas de code entre elles. Si tu modifies
// la vraie logique dans une Function, reporte le changement ici aussi. ---

function extractTextBlock(content) {
    return content?.find((b) => b.type === 'text')?.text?.trim() || null;
}

function normalizeMessages(rawMessages) {
    const messages = [];
    for (const m of rawMessages) {
        const last = messages[messages.length - 1];
        if (last && last.role === m.role) {
            last.content += '\n' + m.content;
        } else {
            messages.push({ ...m });
        }
    }
    while (messages.length > 0 && messages[0].role !== 'user') {
        messages.shift();
    }
    return messages;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`❌ ${name}`);
        console.log(`   ${err.message}`);
        failed++;
    }
}

// ===== extractTextBlock — le bug du bloc "thinking" =====

test('extractTextBlock : trouve le texte quand il est seul', () => {
    const result = extractTextBlock([{ type: 'text', text: 'Wèèh ça va !' }]);
    assert.strictEqual(result, 'Wèèh ça va !');
});

test('extractTextBlock : trouve le texte même précédé d\'un bloc "thinking" (le bug réel rencontré)', () => {
    const result = extractTextBlock([
        { type: 'thinking', thinking: 'Je réfléchis à ma réponse...' },
        { type: 'text', text: 'Eh Dieu, raconte-moi ça !' },
    ]);
    assert.strictEqual(result, 'Eh Dieu, raconte-moi ça !');
});

test('extractTextBlock : renvoie null si aucun bloc "text" (ne doit jamais planter)', () => {
    const result = extractTextBlock([{ type: 'thinking', thinking: '...' }]);
    assert.strictEqual(result, null);
});

test('extractTextBlock : renvoie null si content est vide ou absent', () => {
    assert.strictEqual(extractTextBlock([]), null);
    assert.strictEqual(extractTextBlock(undefined), null);
});

test('extractTextBlock : coupe les espaces autour du texte', () => {
    const result = extractTextBlock([{ type: 'text', text: '  Salut !  ' }]);
    assert.strictEqual(result, 'Salut !');
});

// ===== normalizeMessages — l'alternance stricte user/assistant =====

test('normalizeMessages : laisse intacte une alternance déjà correcte', () => {
    const input = [
        { role: 'user', content: 'Salut' },
        { role: 'assistant', content: 'Wèèh !' },
        { role: 'user', content: 'Ça va ?' },
    ];
    const result = normalizeMessages(input);
    assert.deepStrictEqual(result.map((m) => m.role), ['user', 'assistant', 'user']);
});

test('normalizeMessages : fusionne deux messages "user" consécutifs (cas d\'une réponse Vanessa échouée)', () => {
    const input = [
        { role: 'user', content: 'Okay' },
        { role: 'user', content: 'cc' },
    ];
    const result = normalizeMessages(input);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].role, 'user');
    assert.strictEqual(result[0].content, 'Okay\ncc');
});

test('normalizeMessages : fusionne plusieurs messages "user" d\'affilée après plusieurs échecs successifs, et retire le message "assistant" orphelin en tête', () => {
    const input = [
        { role: 'assistant', content: 'Salut' },
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' },
        { role: 'user', content: 'c' },
    ];
    const result = normalizeMessages(input);
    // Le "assistant" isolé en tête est retiré (Claude exige un premier
    // message "user") — seul le "user" fusionné doit rester.
    assert.deepStrictEqual(result.map((m) => m.role), ['user']);
    assert.strictEqual(result[0].content, 'a\nb\nc');
});

test('normalizeMessages : retire un premier message "assistant" orphelin (Claude exige de commencer par "user")', () => {
    const input = [
        { role: 'assistant', content: 'Bonjour !' },
        { role: 'user', content: 'Salut' },
    ];
    const result = normalizeMessages(input);
    assert.strictEqual(result[0].role, 'user');
});

test('normalizeMessages : renvoie un tableau vide si tout est "assistant"', () => {
    const input = [{ role: 'assistant', content: 'Bonjour !' }];
    const result = normalizeMessages(input);
    assert.strictEqual(result.length, 0);
});

test('normalizeMessages : ne modifie pas un tableau vide', () => {
    assert.deepStrictEqual(normalizeMessages([]), []);
});

// ===== Résumé =====
console.log('');
console.log(`${passed} test(s) réussi(s), ${failed} échoué(s).`);
if (failed > 0) {
    console.log('\n⚠️  NE PAS DÉPLOYER tant que ces tests échouent.');
    process.exit(1);
}