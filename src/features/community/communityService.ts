// src/features/community/communityService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface AgentAccount {
    userId: string;
    name: string;
    email: string;
    phone: string;
    registeredAt: string;
    joinedAt: string;
    hasPhoto: boolean;
    stories: number;
    comments: number;
    suggestionsCount: number;
    lastSuggestionAt: string;
    active: boolean;
}

export interface AgentSuggestion {
    id: string;
    userId: string;
    name: string;
    content: string;
    createdAt: string;
}

export interface AgentReport {
    totals: { registered: number; active: number; withSuggestion: number; suggestions: number };
    accounts: AgentAccount[];
    suggestions: AgentSuggestion[];
    truncated?: boolean;
}

export type SuggestionStatus = 'nouvelle' | 'lue' | 'traitee';

export interface AdminSuggestion {
    id: string;
    content: string;
    userId: string;
    name: string;
    status: SuggestionStatus;
    createdAt: string;
}

export interface AgentSummary {
    id: string;
    name: string;
    email: string;
    registered: number;
    lastRegisteredAt: string;
}

const call = <T,>(payload: object) => callFunction<T>(FUNCTIONS.MANAGE_COMMUNITY, payload);

export const communityService = {
    // Agent
    agentReport: () => call<AgentReport>({ action: 'agent_report' }),
    agentRegister: (email: string) =>
        call<{ account: { userId: string; name: string; email: string; phone: string } }>({ action: 'agent_register', email }),
    agentUnregister: (userId: string) => call({ action: 'agent_unregister', userId }),
    // Modérateur
    listSuggestions: (status?: SuggestionStatus, offset = 0) =>
        call<{ total: number; suggestions: AdminSuggestion[] }>({ action: 'list_suggestions', status, offset }),
    setSuggestionStatus: (id: string, status: SuggestionStatus) => call({ action: 'set_suggestion_status', id, status }),
    deleteSuggestion: (id: string) => call({ action: 'delete_suggestion', id }),
    agentsOverview: () => call<{ agents: AgentSummary[] }>({ action: 'agents_overview' }),
    reportOf: (agentId: string) => call<AgentReport>({ action: 'agent_report', agentId }),
};
