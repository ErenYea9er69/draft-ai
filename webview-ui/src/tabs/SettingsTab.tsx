import { useState, useEffect } from "react";
import { useVSCode } from "../hooks/useVSCode";

interface SettingsTabProps {
    onEditProfile: () => void;
}

export default function SettingsTab({ onEditProfile }: SettingsTabProps) {
    const { postMessage } = useVSCode();
    const [settings, setSettings] = useState({
        longcatApiKey: "",
        tavilyApiKey: "",
        scanIntervalMinutes: 30,
        gitAwareScanning: true,
        enableCodeHealth: true,
        enableCompetitorInsights: true,
        enableUIAudit: true,
        enableTeamMode: false,
    });
    const [saved, setSaved] = useState(false);
    const [chatCleared, setChatCleared] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.type === "settingsLoaded" && msg.payload) {
                setSettings(msg.payload);
            }
            if (msg.type === "chatCleared") {
                setChatCleared(true);
                setTimeout(() => setChatCleared(false), 2000);
            }
            if (msg.type === "teamModeStatus" && msg.payload) {
                setSettings((prev) => ({ ...prev, enableTeamMode: msg.payload.enabled }));
            }
        };
        window.addEventListener("message", handleMessage);
        postMessage("getSettings");
        return () => window.removeEventListener("message", handleMessage);
    }, [postMessage]);

    const handleSave = () => {
        postMessage("saveSettings", settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updateSetting = (key: string, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleTeamModeToggle = () => {
        const newVal = !settings.enableTeamMode;
        if (newVal) {
            postMessage("enableTeamMode");
        } else {
            postMessage("disableTeamMode");
        }
        updateSetting("enableTeamMode", newVal);
    };

    const handleClearChat = () => {
        postMessage("clearChatHistory");
    };

    return (
        <div className="fade-in">
            {/* API Keys */}
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>🔑 API Keys</h4>

            <div className="form-group">
                <label className="form-label">LongCat API Key</label>
                <input
                    className="input"
                    type="password"
                    placeholder="Enter your LongCat API key"
                    value={settings.longcatApiKey}
                    onChange={(e) => updateSetting("longcatApiKey", e.target.value)}
                />
                <p className="form-hint">
                    Get your key at{" "}
                    <a href="https://longcat.chat/platform/api_keys" style={{ color: "var(--draftai-accent)" }}>
                        longcat.chat/platform/api_keys
                    </a>
                </p>
            </div>

            <div className="form-group">
                <label className="form-label">Tavily API Key</label>
                <input
                    className="input"
                    type="password"
                    placeholder="Enter your Tavily API key"
                    value={settings.tavilyApiKey}
                    onChange={(e) => updateSetting("tavilyApiKey", e.target.value)}
                />
                <p className="form-hint">
                    Get your key at{" "}
                    <a href="https://tavily.com" style={{ color: "var(--draftai-accent)" }}>
                        tavily.com
                    </a>
                </p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--draftai-border)", margin: "16px 0" }} />

            {/* Scan Settings */}
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>⚙️ Scan Settings</h4>

            <div className="setting-row">
                <div>
                    <div className="setting-label">Scan Interval</div>
                    <div className="setting-desc">{settings.scanIntervalMinutes} minutes</div>
                </div>
                <input
                    type="range"
                    min={15}
                    max={120}
                    step={15}
                    value={settings.scanIntervalMinutes}
                    onChange={(e) => updateSetting("scanIntervalMinutes", Number(e.target.value))}
                    style={{ width: 100 }}
                />
            </div>

            <div className="setting-row">
                <div>
                    <div className="setting-label">Git-Aware Scanning</div>
                    <div className="setting-desc">Only scan changed files</div>
                </div>
                <button
                    className={`toggle ${settings.gitAwareScanning ? "on" : ""}`}
                    onClick={() => updateSetting("gitAwareScanning", !settings.gitAwareScanning)}
                />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--draftai-border)", margin: "16px 0" }} />

            {/* Pillar Toggles */}
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>📊 Pillars</h4>

            <div className="setting-row">
                <div>
                    <div className="setting-label">🛡️ Code Health</div>
                </div>
                <button
                    className={`toggle ${settings.enableCodeHealth ? "on" : ""}`}
                    onClick={() => updateSetting("enableCodeHealth", !settings.enableCodeHealth)}
                />
            </div>

            <div className="setting-row">
                <div>
                    <div className="setting-label">🔍 Competitor Insights</div>
                </div>
                <button
                    className={`toggle ${settings.enableCompetitorInsights ? "on" : ""}`}
                    onClick={() => updateSetting("enableCompetitorInsights", !settings.enableCompetitorInsights)}
                />
            </div>

            <div className="setting-row">
                <div>
                    <div className="setting-label">🎨 UI/UX Audit</div>
                </div>
                <button
                    className={`toggle ${settings.enableUIAudit ? "on" : ""}`}
                    onClick={() => updateSetting("enableUIAudit", !settings.enableUIAudit)}
                />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--draftai-border)", margin: "16px 0" }} />

            {/* Team Mode */}
            <h4 style={{ fontSize: 13, marginBottom: 12 }}>👥 Team Mode</h4>

            <div className="setting-row">
                <div>
                    <div className="setting-label">Share via .draftai.json</div>
                    <div className="setting-desc">Export profile & settings for your team</div>
                </div>
                <button
                    className={`toggle ${settings.enableTeamMode ? "on" : ""}`}
                    onClick={handleTeamModeToggle}
                />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--draftai-border)", margin: "16px 0" }} />

            {/* Save & Profile & Chat */}
            <div className="flex flex-col gap-sm">
                <button className="btn btn-primary w-full" onClick={handleSave}>
                    {saved ? "✓ Saved!" : "💾 Save Settings"}
                </button>
                <button className="btn btn-secondary w-full" onClick={onEditProfile}>
                    📝 Edit Project Profile
                </button>
                <button className="btn btn-secondary w-full" onClick={handleClearChat}>
                    {chatCleared ? "✓ Cleared!" : "🗑️ Clear Chat History"}
                </button>
            </div>
        </div>
    );
}

