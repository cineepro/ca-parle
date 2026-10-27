// functions/manage-community/src/main.js — Vanessa
// Suggestions des utilisateurs (#construisonsVanessa) et suivi des agents commerciaux.
//   Tout utilisateur :   { action: 'submit_suggestion', content }
//   Agent (isAgent) :    { action: 'agent_register', email } · { action: 'agent_report' } · { action: 'agent_unregister', userId }
//   Modérateur :         { action: 'list_suggestions', status?, offset? } · { action: 'set_suggestion_status', id, status } · { action: 'delete_suggestion', id }
//                        { action: 'agents_overview' } · { action: 'agent_report', agentId }
// Vanessa ne lit JAMAIS la collection des suggestions : elle n'alimente aucune réponse.
import { Client, Databases, Query, ID } from 'node-appwrite';
import {
    cleanSuggestion, cleanEmail, chunk, buildReport, STATUSES, MAX_SUGGESTIONS_PER_DAY,
} from './logic.js';

const IN_LIMIT = 100;

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DB = process.env.DATABASE_ID;
    const USERS = process.env.COLLECTION_USERS;
    const SUGGESTIONS = process.env.COLLECTION_SUGGESTIONS;
    const REGISTRATIONS = process.env.COLLECTION_AGENT_REGISTRATIONS;

    const fetchUsers = async (ids) => {
        const map = new Map();
        for (const part of chunk([...new Set(ids)], IN_LIMIT)) {
            const r = await databases.listDocuments(DB, USERS, [Query.equal('$id', part), Query.limit(IN_LIMIT)]);
            r.documents.forEach((d) => map.set(d.$id, d));
        }
        return map;
    };

    const report = async (agentId) => {
        const regs = await databases.listDocuments(DB, REGISTRATIONS, [Query.equal('agentId', agentId), Query.orderDesc('registeredAt'), Query.limit(500)]);
        const ids = regs.documents.map((r) => r.userId);
        const usersById = await fetchUsers(ids);
        const suggestions = [];
        for (const part of chunk(ids, IN_LIMIT)) {
            const r = await databases.listDocuments(DB, SUGGESTIONS, [Query.equal('submittedBy', part), Query.orderDesc('createdAt'), Query.limit(500)]);
            suggestions.push(...r.documents);
        }
        return { ...buildReport(regs.documents, usersById, suggestions), truncated: regs.total > 500 };
    };

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;
        const caller = await databases.getDocument(DB, USERS, callerId);
        if (caller.isBanned) return res.json({ success: false, error: 'Compte suspendu.' }, 403);
        const isMod = caller.isModerator === true;
        const isAgent = caller.isAgent === true;

        // — Tout utilisateur —
        if (action === 'submit_suggestion') {
            if (!SUGGESTIONS) return res.json({ success: false, error: 'Les propositions ne sont pas encore activées.' });
            const c = cleanSuggestion(body.content);
            if (c.error) return res.json({ success: false, error: c.error });
            const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
            const recent = await databases.listDocuments(DB, SUGGESTIONS, [
                Query.equal('submittedBy', callerId), Query.greaterThan('createdAt', since), Query.limit(1),
            ]);
            if (recent.total >= MAX_SUGGESTIONS_PER_DAY) {
                return res.json({ success: false, error: 'Tu as déjà beaucoup proposé aujourd’hui, reviens demain !' });
            }
            await databases.createDocument(DB, SUGGESTIONS, ID.unique(), {
                content: c.text,
                submittedBy: callerId,
                submitterName: String(caller.name || '').slice(0, 100),
                status: 'nouvelle',
                createdAt: new Date().toISOString(),
            });
            return res.json({ success: true });
        }

        // — Agents —
        if (action === 'agent_register' || action === 'agent_unregister' || (action === 'agent_report' && !body.agentId)) {
            if (!isAgent) return res.json({ success: false, error: 'Espace réservé aux agents.' }, 403);
            if (!REGISTRATIONS) return res.json({ success: false, error: 'Le suivi des agents n’est pas encore activé.' });

            if (action === 'agent_register') {
                const e = cleanEmail(body.email);
                if (e.error) return res.json({ success: false, error: e.error });
                const variants = [...new Set([e.email, e.lower])];
                const found = await databases.listDocuments(DB, USERS, [Query.equal('email', variants), Query.limit(2)]);
                const user = found.documents[0];
                if (!user) return res.json({ success: false, error: 'Aucun compte Vanessa avec cette adresse. Vérifie qu’elle est écrite exactement comme à l’inscription.' });
                if (user.$id === callerId) return res.json({ success: false, error: 'Tu ne peux pas enregistrer ton propre compte.' });
                // L'identifiant du document est celui du compte : un compte ne peut appartenir qu'à un seul agent.
                const existing = await databases.getDocument(DB, REGISTRATIONS, user.$id).catch(() => null);
                if (existing) {
                    return res.json({
                        success: false,
                        error: existing.agentId === callerId ? 'Ce compte est déjà dans ta liste.' : 'Ce compte a déjà été enregistré par un autre agent.',
                    });
                }
                await databases.createDocument(DB, REGISTRATIONS, user.$id, {
                    agentId: callerId, userId: user.$id, registeredAt: new Date().toISOString(),
                });
                log(`🧑‍💼 agent ${callerId} a enregistré ${user.$id}`);
                return res.json({ success: true, account: { userId: user.$id, name: user.name || '', email: user.email || '', phone: user.phone || '' } });
            }

            if (action === 'agent_unregister') {
                const userId = String(body.userId || '');
                const reg = await databases.getDocument(DB, REGISTRATIONS, userId).catch(() => null);
                if (!reg || reg.agentId !== callerId) return res.json({ success: false, error: 'Compte introuvable dans ta liste.' });
                await databases.deleteDocument(DB, REGISTRATIONS, userId);
                return res.json({ success: true });
            }

            return res.json({ success: true, ...(await report(callerId)) });
        }

        // — Modérateurs —
        if (!isMod) return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);

        if (action === 'list_suggestions') {
            const queries = [Query.orderDesc('createdAt'), Query.limit(50), Query.offset(Math.max(0, Number(body.offset) || 0))];
            if (STATUSES.includes(body.status)) queries.unshift(Query.equal('status', body.status));
            const r = await databases.listDocuments(DB, SUGGESTIONS, queries);
            return res.json({
                success: true,
                total: r.total,
                suggestions: r.documents.map((d) => ({
                    id: d.$id, content: d.content, userId: d.submittedBy, name: d.submitterName || '', status: d.status || 'nouvelle', createdAt: d.createdAt,
                })),
            });
        }

        if (action === 'set_suggestion_status') {
            if (!STATUSES.includes(body.status)) return res.json({ success: false, error: 'Statut inconnu.' });
            await databases.updateDocument(DB, SUGGESTIONS, String(body.id || ''), { status: body.status });
            return res.json({ success: true });
        }

        if (action === 'delete_suggestion') {
            await databases.deleteDocument(DB, SUGGESTIONS, String(body.id || ''));
            return res.json({ success: true });
        }

        if (action === 'agents_overview') {
            const agents = await databases.listDocuments(DB, USERS, [Query.equal('isAgent', true), Query.limit(100)]);
            const out = [];
            for (const a of agents.documents) {
                const regs = await databases.listDocuments(DB, REGISTRATIONS, [Query.equal('agentId', a.$id), Query.limit(1)]);
                const last = regs.total > 0
                    ? (await databases.listDocuments(DB, REGISTRATIONS, [Query.equal('agentId', a.$id), Query.orderDesc('registeredAt'), Query.limit(1)])).documents[0]?.registeredAt
                    : '';
                out.push({ id: a.$id, name: a.name || '', email: a.email || '', registered: regs.total, lastRegisteredAt: last || '' });
            }
            return res.json({ success: true, agents: out });
        }

        if (action === 'agent_report') {
            return res.json({ success: true, ...(await report(String(body.agentId))) });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
