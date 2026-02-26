import { useState, useRef, useEffect } from "react";
import { useVSCode } from "../hooks/useVSCode";

interface ChatInputProps {
    context?: string;
}

export default function ChatInput({ context }: ChatInputProps) {
    const { postMessage } = useVSCode();
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
        }
    }, [message]);

    // Listen for chat response to stop sending state
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.type === "chatResponse" || msg.type === "error") {
                setSending(false);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleSend = () => {
        if (!message.trim() || sending) return;
        setSending(true);
        postMessage("sendChatMessage", {
            content: message.trim(),
            context,
        });
        setMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-input-wrapper">
            <div className="chat-input-container">
                <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder="Ask Draft AI anything..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={sending}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                >
                    {sending ? <span className="spinner" /> : "→"}
                </button>
            </div>
        </div>
    );
}
