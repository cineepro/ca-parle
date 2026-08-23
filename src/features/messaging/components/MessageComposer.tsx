// src/features/messaging/components/MessageComposer.tsx — Ça Parle
import { useState } from 'react';

interface Props {
    onSend: (content: string) => void;
    sending: boolean;
}

export const MessageComposer = ({ onSend, sending }: Props) => {
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSend(content);
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 bg-white border-t border-gray-100">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                    }
                }}
                placeholder="Écris un message..."
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 max-h-32"
            />
            <button
                type="submit"
                disabled={!content.trim() || sending}
                className="shrink-0 w-10 h-10 rounded-full bg-[#FF4757] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#e63e4d] transition-colors"
                aria-label="Envoyer"
            >
                ➤
            </button>
        </form>
    );
};