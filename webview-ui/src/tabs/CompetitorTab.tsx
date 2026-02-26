import { useState, useEffect } from "react";
import { useVSCode } from "../hooks/useVSCode";

export default function CompetitorTab() {
    const { postMessage } = useVSCode();
    const [result, setResult] = useState<any>(null);
    const [depth, setDepth] = useState<"surface" | "deep">("surface");
    const [running, setRunning] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case "researchComplete":
                    setResult(msg.payload);
                    setRunning(false);
                    break;
                case "researchProgress":
                    setStatusMsg(msg.payload?.message || "");
                    if (msg.payload?.status === "complete") {
                        setRunning(false);
                    }
                    break;
            }
        };
        window.addEventListener("message", handleMessage);
        postMessage("getResearchResults");
        return () => window.removeEventListener("message", handleMessage);
    }, [postMessage]);

    const handleRun = () => {
        setRunning(true);
        setStatusMsg("Starting research...");
        postMessage("runResearch", { depth });
    };

    if (!result) {
        return (
            <div className="empty-state fade-in">
                <div className="empty-state-icon">🔍</div>
                <h3 className="empty-state-title">Competitor Insights</h3>
                <p className="empty-state-desc">
                    Run a research scan to get competitive analysis, gap identification, and a prioritized roadmap.
                </p>

                <div className="form-group">
                    <label className="form-label">Research Depth</label>
                    <div className="flex gap-sm">
                        <button
                            className={`btn ${depth === "surface" ? "btn-primary" : "btn-secondary"} btn-sm`}
                            onClick={() => setDepth("surface")}
                            style={{ flex: 1 }}
                        >
                            ⚡ Surface
                        </button>
                        <button
                            className={`btn ${depth === "deep" ? "btn-primary" : "btn-secondary"} btn-sm`}
                            onClick={() => setDepth("deep")}
                            style={{ flex: 1 }}
                        >
                            🔬 Deep
                        </button>
                    </div>
                    <p className="form-hint">
                        {depth === "surface"
                            ? "Quick scan — landing pages & feature lists (~1 min)"
                            : "Deep scan — reviews, Reddit, Product Hunt (~3-5 min)"}
                    </p>
                </div>

                <button
                    className="btn btn-primary w-full"
                    onClick={handleRun}
                    disabled={running}
                >
                    {running ? (
                        <>
                            <span className="spinner" /> Researching...
                        </>
                    ) : (
                        "🚀 Run Research"
                    )}
                </button>
                {statusMsg && <p className="text-sm text-muted mt-md">{statusMsg}</p>}
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Last run info */}
            <div className="card mb-md">
                <div className="card-header">
                    <span className="card-title">Competitor Research</span>
                    <span className={`badge ${result.depth === "deep" ? "warning" : "suggestion"}`}>
                        {result.depth}
                    </span>
                </div>
                <p className="text-sm text-muted">
                    Last run: {new Date(result.timestamp).toLocaleString()}
                </p>
            </div>

            {/* Gap Analysis */}
            {result.gapAnalysis && (
                <>
                    {result.gapAnalysis.missingFeatures?.length > 0 && (
                        <div className="card">
                            <h4 className="card-title" style={{ marginBottom: 8 }}>🎯 Missing Features</h4>
                            <ul style={{ paddingLeft: 16 }}>
                                {result.gapAnalysis.missingFeatures.map((f: string, i: number) => (
                                    <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.gapAnalysis.opportunities?.length > 0 && (
                        <div className="card">
                            <h4 className="card-title" style={{ marginBottom: 8 }}>💡 Opportunities</h4>
                            <ul style={{ paddingLeft: 16 }}>
                                {result.gapAnalysis.opportunities.map((o: string, i: number) => (
                                    <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{o}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {/* Roadmap */}
            {result.roadmap?.length > 0 && (
                <div className="card">
                    <h4 className="card-title" style={{ marginBottom: 8 }}>🗺️ Suggested Roadmap</h4>
                    {result.roadmap.map((item: any, i: number) => (
                        <div key={i} style={{ padding: "8px 0", borderBottom: i < result.roadmap.length - 1 ? "1px solid var(--draftai-border)" : "none" }}>
                            <div className="flex" style={{ alignItems: "center", gap: 8 }}>
                                <span className={`badge ${item.priority === "high" ? "critical" : item.priority === "medium" ? "warning" : "suggestion"}`}>
                                    {item.priority}
                                </span>
                                <span className="text-sm" style={{ fontWeight: 600 }}>{item.title}</span>
                            </div>
                            <p className="text-sm text-muted" style={{ marginTop: 4 }}>{item.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Rerun button */}
            <button
                className="btn btn-secondary w-full mt-md"
                onClick={handleRun}
                disabled={running}
            >
                {running ? "Researching..." : "↻ Run New Research"}
            </button>
        </div>
    );
}
