import { useState, useEffect } from "react";
import { useVSCode } from "../hooks/useVSCode";

export default function CodeHealthTab() {
    const { postMessage } = useVSCode();
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case "scanComplete":
                    setScanResult(msg.payload);
                    setScanning(false);
                    break;
                case "scanProgress":
                    setStatusMsg(msg.payload?.message || "");
                    if (msg.payload?.status === "complete") {
                        setScanning(false);
                    }
                    break;
            }
        };
        window.addEventListener("message", handleMessage);
        postMessage("getScanResults");
        return () => window.removeEventListener("message", handleMessage);
    }, [postMessage]);

    const handleRunScan = () => {
        setScanning(true);
        setStatusMsg("Starting scan...");
        postMessage("runScan");
    };

    const handleSuppress = (issueId: string) => {
        postMessage("suppressIssue", { issueId });
        if (scanResult?.issues) {
            setScanResult({
                ...scanResult,
                issues: scanResult.issues.map((i: any) =>
                    i.id === issueId ? { ...i, suppressed: true } : i
                ),
            });
        }
    };

    if (!scanResult) {
        return (
            <div className="empty-state fade-in">
                <div className="empty-state-icon">🛡️</div>
                <h3 className="empty-state-title">No scan results yet</h3>
                <p className="empty-state-desc">
                    Run your first code health scan to find security issues, bugs, and performance problems.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleRunScan}
                    disabled={scanning}
                >
                    {scanning ? (
                        <>
                            <span className="spinner" /> Scanning...
                        </>
                    ) : (
                        "🔍 Run First Scan"
                    )}
                </button>
                {statusMsg && <p className="text-sm text-muted mt-md">{statusMsg}</p>}
            </div>
        );
    }

    const activeIssues = scanResult.issues?.filter((i: any) => !i.suppressed) ?? [];
    const criticals = activeIssues.filter((i: any) => i.severity === "critical");
    const warnings = activeIssues.filter((i: any) => i.severity === "warning");
    const suggestions = activeIssues.filter((i: any) => i.severity === "suggestion");

    return (
        <div className="fade-in">
            {/* Summary */}
            <div className="card mb-md">
                <div className="card-header">
                    <span className="card-title">Last Scan</span>
                    <span className="text-sm text-muted">
                        {new Date(scanResult.timestamp).toLocaleString()}
                    </span>
                </div>
                <div className="flex gap-md" style={{ justifyContent: "space-around" }}>
                    <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--draftai-danger)" }}>
                            {criticals.length}
                        </div>
                        <div className="text-sm text-muted">Critical</div>
                    </div>
                    <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--draftai-warning)" }}>
                            {warnings.length}
                        </div>
                        <div className="text-sm text-muted">Warning</div>
                    </div>
                    <div className="text-center">
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--draftai-info)" }}>
                            {suggestions.length}
                        </div>
                        <div className="text-sm text-muted">Suggestions</div>
                    </div>
                </div>
            </div>

            {/* Rescan button */}
            <button
                className="btn btn-secondary btn-sm w-full mb-md"
                onClick={handleRunScan}
                disabled={scanning}
            >
                {scanning ? "Scanning..." : "↻ Rescan"}
            </button>

            {/* Issues */}
            {activeIssues.map((issue: any) => (
                <div key={issue.id} className="card">
                    <div className="card-header">
                        <span className={`badge ${issue.severity}`}>{issue.severity}</span>
                        <span className="card-title">{issue.title}</span>
                    </div>
                    <p className="text-sm text-muted" style={{ marginBottom: 6 }}>
                        {issue.file}:{issue.line}
                    </p>
                    <p className="text-sm">{issue.description}</p>
                    {issue.fix && (
                        <pre style={{
                            background: "rgba(0,0,0,0.2)",
                            padding: 8,
                            borderRadius: 4,
                            fontSize: 11,
                            marginTop: 8,
                            overflow: "auto",
                        }}>
                            <code>{issue.fix}</code>
                        </pre>
                    )}
                    <div className="flex gap-sm mt-md">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSuppress(issue.id)}
                        >
                            Suppress
                        </button>
                    </div>
                </div>
            ))}

            {activeIssues.length === 0 && (
                <div className="text-center text-muted mt-md">
                    ✨ No active issues. Your code is looking great!
                </div>
            )}
        </div>
    );
}
