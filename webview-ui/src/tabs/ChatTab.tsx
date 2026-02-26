import { useState, useEffect, useRef } from "react";
import { useVSCode } from "../hooks/useVSCode";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export default function ChatTab() {
    const { postMessage } = useVSCode();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent]);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
        }
    }, [input]);

    // Listen for messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case "chatStreamChunk":
                    setStreamingContent(msg.payload.fullResponse);
                    break;
                case "chatResponse":
                    if (Array.isArray(msg.payload)) {
                        // Initial history load
                        setMessages(msg.payload);
                    } else if (msg.payload) {
                        // Single response
                        setMessages((prev) => [...prev, msg.payload]);
                        setStreamingContent("");
                        setSending(false);
                    }
                    break;
                case "error":
                    setStreamingContent("");
                    setSending(false);
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `err-${Date.now()}`,
                            role: "assistant",
                            content: `⚠️ ${msg.payload}`,
                            timestamp: new Date().toISOString(),
                        },
                    ]);
                    break;
            }
        };
        window.addEventListener("message", handleMessage);
        postMessage("getChatHistory");
        return () => window.removeEventListener("message", handleMessage);
    }, [postMessage]);

    const handleSend = () => {
        if (!input.trim() || sending) return;

        const userMsg: Message = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setSending(true);
        setStreamingContent("");
        postMessage("sendChatMessage", { content: input.trim(), context: "chat" });
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Messages */}
            <div className="chat-messages" style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
                {messages.length === 0 && !streamingContent && (
                    <div className="empty-state">
                        <div className="empty-state-icon">💬</div>
                        <h3 className="empty-state-title">Ask Draft AI anything</h3>
                        <p className="empty-state-desc">
                            I know your codebase, project profile, scan results, and competitor research. Ask me anything specific to your project.
                        </p>
                        <div className="flex flex-col gap-sm" style={{ textAlign: "left", maxWidth: 280, margin: "0 auto" }}>
                            {[
                                "What should I build next?",
                                "Is my code secure?",
                                "How do I compare to competitors?",
                                "Review my component structure",
                            ].map((q) => (
                                <button
                                    key={q}
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setInput(q);
                                        setTimeout(() => textareaRef.current?.focus(), 50);
                                    }}
                                    style={{ justifyContent: "flex-start", textAlign: "left" }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        {msg.content}
                    </div>
                ))}

                {streamingContent && (
                    <div className="chat-message assistant">
                        {streamingContent}
                        <span className="spinner" style={{ marginLeft: 4, verticalAlign: "middle" }} />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input (this tab has its own input since it doesn't use the global ChatInput) */}
            <div style={{
                padding: "10px 0",
                borderTop: "1px solid var(--draftai-border)",
                marginTop: "auto",
            }}>
                <div className="chat-input-container">
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        placeholder="Ask Draft AI anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={sending}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                    >
                        {sending ? <span className="spinner" /> : "→"}
                    </button>
                </div>
            </div>
        </div>
    );
}
