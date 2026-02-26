import { useState, useEffect, useCallback } from "react";
import { useVSCode } from "./hooks/useVSCode";
import Onboarding from "./components/Onboarding";
import ScoreBar from "./components/ScoreBar";
import ChatInput from "./components/ChatInput";
import CodeHealthTab from "./tabs/CodeHealthTab";
import CompetitorTab from "./tabs/CompetitorTab";
import UIAuditTab from "./tabs/UIAuditTab";
import SettingsTab from "./tabs/SettingsTab";
import ChatTab from "./tabs/ChatTab";

type TabId = "health" | "competitor" | "audit" | "settings" | "chat";

const TABS: { id: TabId; icon: string; label: string }[] = [
    { id: "health", icon: "🛡️", label: "Health" },
    { id: "competitor", icon: "🔍", label: "Insights" },
    { id: "audit", icon: "🎨", label: "Audit" },
    { id: "settings", icon: "⚙️", label: "Settings" },
    { id: "chat", icon: "💬", label: "Chat" },
];

interface Scores {
    codeHealth: number;
    uiConsistency: number;
    competitivePosition: number;
}

export default function App() {
    const { postMessage } = useVSCode();
    const [activeTab, setActiveTab] = useState<TabId>("health");
    const [hasProfile, setHasProfile] = useState<boolean | null>(null); // null = loading
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [scores, setScores] = useState<Scores>({
        codeHealth: 0,
        uiConsistency: 0,
        competitivePosition: 0,
    });

    // Listen for messages from the extension host
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case "profileLoaded":
                    if (message.payload) {
                        setHasProfile(true);
                        setShowOnboarding(false);
                    } else {
                        setHasProfile(false);
                        setShowOnboarding(true);
                    }
                    break;
                case "profileSaved":
                    setHasProfile(true);
                    setShowOnboarding(false);
                    break;
                case "scoresUpdated":
                    if (message.payload) {
                        setScores(message.payload);
                    }
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // On mount, request profile and scores
    useEffect(() => {
        postMessage("getProfile");
        postMessage("getScores");
    }, [postMessage]);

    const handleProfileSaved = useCallback(() => {
        setHasProfile(true);
        setShowOnboarding(false);
    }, []);

    const handleEditProfile = useCallback(() => {
        setShowOnboarding(true);
    }, []);

    // Show onboarding if no profile
    if (showOnboarding || hasProfile === false) {
        return (
            <div className="app">
                <Onboarding onComplete={handleProfileSaved} />
            </div>
        );
    }

    // Loading state
    if (hasProfile === null) {
        return (
            <div className="app">
                <div className="loading">Loading Draft AI...</div>
            </div>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case "health":
                return <CodeHealthTab />;
            case "competitor":
                return <CompetitorTab />;
            case "audit":
                return <UIAuditTab />;
            case "settings":
                return <SettingsTab onEditProfile={handleEditProfile} />;
            case "chat":
                return <ChatTab />;
        }
    };

    return (
        <div className="app">
            <ScoreBar scores={scores} />

            <nav className="tab-nav">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="tab-content fade-in" key={activeTab}>
                {renderTab()}
            </div>

            {activeTab !== "chat" && (
                <ChatInput context={activeTab} />
            )}
        </div>
    );
}
