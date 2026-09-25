// src/api/constants.ts — Ça Parle
// Source de vérité unique pour la base de données et les IDs de
// collections. Regroupé ici (et non dans auth.ts) car la majorité de ces
// collections n'ont rien à voir avec l'authentification — seule USERS en
// est réellement une, et elle est PARTAGÉE avec Kinema+.
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';

export const COLLECTIONS = {
    // Partagée avec Kinema+
    USERS: import.meta.env.VITE_APPWRITE_COLLECTION_USERS || '',

    // Propres à Ça Parle
    STORIES: import.meta.env.VITE_APPWRITE_COLLECTION_STORIES || '',
    STORY_UPDATES: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_UPDATES || '',
    COMMENTS: import.meta.env.VITE_APPWRITE_COLLECTION_COMMENTS || '',
    REACTIONS: import.meta.env.VITE_APPWRITE_COLLECTION_REACTIONS || '',
    PREDICTIONS: import.meta.env.VITE_APPWRITE_COLLECTION_PREDICTIONS || '',
    PREDICTION_VOTES: import.meta.env.VITE_APPWRITE_COLLECTION_PREDICTION_VOTES || '',
    STORY_VERSIONS: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_VERSIONS || '',
    VERSION_VOTES: import.meta.env.VITE_APPWRITE_COLLECTION_VERSION_VOTES || '',
    REFERENCES: import.meta.env.VITE_APPWRITE_COLLECTION_REFERENCES || '',
    STORY_REFERENCES: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_REFERENCES || '',
    FOLLOWS: import.meta.env.VITE_APPWRITE_COLLECTION_FOLLOWS || '',
    NOTIFICATIONS: import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICATIONS || '',
    REPORTS: import.meta.env.VITE_APPWRITE_COLLECTION_REPORTS || '',
    BADGES: import.meta.env.VITE_APPWRITE_COLLECTION_BADGES || '',
    USER_BADGES: import.meta.env.VITE_APPWRITE_COLLECTION_USER_BADGES || '',
    CATEGORIES: import.meta.env.VITE_APPWRITE_COLLECTION_CATEGORIES || '',
    CONVERSATIONS: import.meta.env.VITE_APPWRITE_COLLECTION_CONVERSATIONS || '',
    MESSAGES: import.meta.env.VITE_APPWRITE_COLLECTION_MESSAGES || '',
    VANESSA_KNOWLEDGE: import.meta.env.VITE_APPWRITE_COLLECTION_VANESSA_KNOWLEDGE || '',

    // "Ça sert" — répertoire local et prix du marché
    LOCAL_SPOTS: import.meta.env.VITE_APPWRITE_COLLECTION_LOCAL_SPOTS || '',
    SPOT_CONFIRMATIONS: import.meta.env.VITE_APPWRITE_COLLECTION_SPOT_CONFIRMATIONS || '',
    MARKET_PRICES: import.meta.env.VITE_APPWRITE_COLLECTION_MARKET_PRICES || '',
} as const;

export const BUCKETS = {
    STORY_IMAGES: import.meta.env.VITE_APPWRITE_BUCKET_STORY_IMAGES || '',
    VOICE_MESSAGES: import.meta.env.VITE_APPWRITE_BUCKET_VOICE_MESSAGES || '',
    CONNECTOR_DOCUMENTS: import.meta.env.VITE_APPWRITE_BUCKET_CONNECTOR_DOCUMENTS || '',
} as const;

// Compte utilisateur de Vanessa (l'IA de Ça Parle) — un vrai compte
// Appwrite Auth + document `users`, créé une fois via scripts/setupVanessa.mjs.
export const VANESSA_USER_ID = import.meta.env.VITE_APPWRITE_VANESSA_USER_ID || '';

// Avatar statique de Vanessa, servi directement par Netlify (public/).
export const VANESSA_AVATAR_URL = '/vanessa-avatar.png';

// IDs des Appwrite Functions appelées depuis le client (celles déclenchées
// par événement — on-story-created, on-comment-created, on-reaction-write
// — n'ont PAS besoin d'être ici : elles ne sont jamais appelées par le
// client, seulement par Appwrite lui-même).
export const FUNCTIONS = {
    RESOLVE_PREDICTION: import.meta.env.VITE_APPWRITE_FUNCTION_RESOLVE_PREDICTION || '',
    MODERATE_CONTENT: import.meta.env.VITE_APPWRITE_FUNCTION_MODERATE_CONTENT || '',
    INCREMENT_VIEW: import.meta.env.VITE_APPWRITE_FUNCTION_INCREMENT_VIEW || '',
    START_CONVERSATION: import.meta.env.VITE_APPWRITE_FUNCTION_START_CONVERSATION || '',
    SEND_MESSAGE: import.meta.env.VITE_APPWRITE_FUNCTION_SEND_MESSAGE || '',
    SEND_NEWSLETTER: import.meta.env.VITE_APPWRITE_FUNCTION_SEND_NEWSLETTER || '',
    UNSUBSCRIBE_NEWSLETTER: import.meta.env.VITE_APPWRITE_FUNCTION_UNSUBSCRIBE_NEWSLETTER || '',
    MANAGE_VANESSA_KNOWLEDGE: import.meta.env.VITE_APPWRITE_FUNCTION_MANAGE_VANESSA_KNOWLEDGE || '',
    SET_VANESSA_CONNECTOR: import.meta.env.VITE_APPWRITE_FUNCTION_SET_VANESSA_CONNECTOR || '',
    RATE_VANESSA_MESSAGE: import.meta.env.VITE_APPWRITE_FUNCTION_RATE_VANESSA_MESSAGE || '',
    MANAGE_VANESSA_MEMORY: import.meta.env.VITE_APPWRITE_FUNCTION_MANAGE_VANESSA_MEMORY || '',
    CONFIRM_SPOT: import.meta.env.VITE_APPWRITE_FUNCTION_CONFIRM_SPOT || '',
    MODERATE_CA_SERT: import.meta.env.VITE_APPWRITE_FUNCTION_MODERATE_CA_SERT || '',
    INGEST_CONNECTOR_PDF: import.meta.env.VITE_APPWRITE_FUNCTION_INGEST_CONNECTOR_PDF || '',
    GET_ROUTE: import.meta.env.VITE_APPWRITE_FUNCTION_GET_ROUTE || '',
    LIST_MESSAGE_FEEDBACK: import.meta.env.VITE_APPWRITE_FUNCTION_LIST_MESSAGE_FEEDBACK || '',
} as const;