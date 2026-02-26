interface ScoreBarProps {
    scores: {
        codeHealth: number;
        uiConsistency: number;
        competitivePosition: number;
    };
}

function getScoreClass(score: number): string {
    if (score === 0) return "none";
    if (score >= 75) return "good";
    if (score >= 50) return "ok";
    return "bad";
}

export default function ScoreBar({ scores }: ScoreBarProps) {
    return (
        <div className="score-bar">
            <div className="score-item">
                <span className={`score-value ${getScoreClass(scores.codeHealth)}`}>
                    {scores.codeHealth || "—"}
                </span>
                <span className="score-label">Code Health</span>
            </div>
            <div className="score-item">
                <span className={`score-value ${getScoreClass(scores.uiConsistency)}`}>
                    {scores.uiConsistency || "—"}
                </span>
                <span className="score-label">UI Score</span>
            </div>
            <div className="score-item">
                <span className={`score-value ${getScoreClass(scores.competitivePosition)}`}>
                    {scores.competitivePosition || "—"}
                </span>
                <span className="score-label">Competitive</span>
            </div>
        </div>
    );
}
