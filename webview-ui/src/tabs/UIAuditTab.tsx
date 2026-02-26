import { useState, useEffect } from "react";
import { useVSCode } from "../hooks/useVSCode";

interface AuditResult {
    designConsistencyScore: number;
    accessibilityScore: number;
    structureScore: number;
    findings: any[];
    timestamp: string;
    comparedUrl?: string;
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
    const color =
        score >= 75 ? "var(--draftai-success)" :
            score >= 50 ? "var(--draftai-warning)" :
                score > 0 ? "var(--draftai-danger)" : "var(--draftai-fg-muted)";

    const circumference = 2 * Math.PI * 30;
    const progress = score > 0 ? (score / 100) * circumference : 0;

    return (
        <div className="score-item">
            <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--draftai-border)" strokeWidth="4" />
                <circle
                    cx="36" cy="36" r="30"
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeDasharray={`${progress} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
                <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
                    fill={color} fontSize="16" fontWeight="700">
                    {score > 0 ? score : "—"}
                </text>
            </svg>
            <span className="score-label">{label}</span>
        </div>
    );
}

export default function UIAuditTab() {
    const { postMessage } = useVSCode();
    const [result, setResult] = useState<AuditResult | null>(null);
    const [comparisonUrl, setComparisonUrl] = useState("");
    const [running, setRunning] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            if (msg.type === "auditComplete") {
                setResult(msg.payload);
                setRunning(false);
            }
        };
        window.addEventListener("message", handleMessage);
        postMessage("getAuditResults");
        return () => window.removeEventListener("message", handleMessage);
    }, [postMessage]);

    const handleRun = () => {
        setRunning(true);
        postMessage("runAudit", { comparisonUrl: comparisonUrl || undefined });
    };

    const areaFindings = (area: string) =>
        result?.findings?.filter((f: any) => f.area === area) ?? [];

    if (!result) {
        return (
            <div className="empty-state fade-in">
                <div className="empty-state-icon">🎨</div>
                <h3 className="empty-state-title">UI/UX Audit</h3>
                <p className="empty-state-desc">
                    Analyze your frontend code for design consistency, accessibility issues, and structural problems.
                </p>

                <div className="form-group">
                    <label className="form-label">Compare with URL (optional)</label>
                    <input
                        className="input"
                        type="url"
                        placeholder="https://competitor.com"
                        value={comparisonUrl}
                        onChange={(e) => setComparisonUrl(e.target.value)}
                    />
                    <p className="form-hint">
                        Paste a competitor or reference URL to compare against
                    </p>
                </div>

                <button
                    className="btn btn-primary w-full"
                    onClick={handleRun}
                    disabled={running}
                >
                    {running ? (
                        <>
                            <span className="spinner" /> Auditing...
                        </>
                    ) : (
                        "🎨 Run UI Audit"
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Score circles */}
            <div className="flex gap-md mb-md" style={{ justifyContent: "center" }}>
                <ScoreCircle score={result.designConsistencyScore} label="Design" />
                <ScoreCircle score={result.accessibilityScore} label="A11y" />
                <ScoreCircle score={result.structureScore} label="Structure" />
            </div>

            {/* Findings by area */}
            {["design", "accessibility", "structure"].map((area) => {
                const findings = areaFindings(area);
                if (findings.length === 0) return null;
                const label = area === "design" ? "🎨 Design Consistency" :
                    area === "accessibility" ? "♿ Accessibility" : "🏗️ Structure";
                return (
                    <div key={area}>
                        <h4 style={{ marginBottom: 8, fontSize: 13 }}>{label}</h4>
                        {findings.map((f: any, i: number) => (
                            <div key={i} className="card">
                                <div className="card-header">
                                    <span className={`badge ${f.severity}`}>{f.severity}</span>
                                    <span className="card-title">{f.title}</span>
                                </div>
                                <p className="text-sm">{f.description}</p>
                                {f.recommendation && (
                                    <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                                        💡 {f.recommendation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}

            <button
                className="btn btn-secondary w-full mt-md"
                onClick={handleRun}
                disabled={running}
            >
                {running ? "Auditing..." : "↻ Re-run Audit"}
            </button>
        </div>
    );
}
