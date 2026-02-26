/* ─── Draft AI — Shared Type Definitions ─── */

// ─── Project Profile ───
export interface ProjectProfile {
  appDescription: string;
  targetUsers: string;
  currentFeatures: string;
  plannedFeatures: string;
  competitors: string[];
  designIntent: string;
  updatedAt: string;
}

// ─── Tech Stack ───
export interface TechStack {
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "unknown";
  hasTypeScript: boolean;
  cssApproach: string[];
  detectedAt: string;
}

// ─── Code Health ───
export type IssueSeverity = "critical" | "warning" | "suggestion";
export type IssueCategory = "security" | "bugs" | "structure" | "performance";

export interface CodeIssue {
  id: string;
  file: string;
  line: number;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  fix: string;
  suppressed: boolean;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  issues: CodeIssue[];
  healthScore: number;
  techStack: TechStack;
  filesScanned: number;
  scanDurationMs: number;
}

// ─── Competitor Insights ───
export type ResearchDepth = "surface" | "deep";

export interface CompetitorProfile {
  name: string;
  strengths: string[];
  weaknesses: string[];
  features: string[];
  pricing?: string;
  userSentiment?: string;
}

export interface GapAnalysis {
  competitorProfiles: CompetitorProfile[];
  missingFeatures: string[];
  opportunities: string[];
  threats: string[];
}

export interface RoadmapItem {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  rationale: string;
}

export interface CompetitorResearchResult {
  id: string;
  timestamp: string;
  depth: ResearchDepth;
  gapAnalysis: GapAnalysis;
  roadmap: RoadmapItem[];
  competitiveScore: number;
}

// ─── UI/UX Audit ───
export interface AuditFinding {
  area: "design" | "accessibility" | "structure";
  title: string;
  description: string;
  recommendation: string;
  severity: IssueSeverity;
  file?: string;
  line?: number;
}

export interface UIAuditResult {
  id: string;
  timestamp: string;
  designConsistencyScore: number;
  accessibilityScore: number;
  structureScore: number;
  findings: AuditFinding[];
  comparedUrl?: string;
}

// ─── Chat ───
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: string; // Which tab the message was sent from
}

// ─── Scores ───
export interface ConfidenceScores {
  codeHealth: number;
  uiConsistency: number;
  competitivePosition: number;
}

// ─── Webview Messaging ───
export type WebviewMessageType =
  | "getProfile"
  | "saveProfile"
  | "getScores"
  | "runScan"
  | "getScanResults"
  | "runResearch"
  | "getResearchResults"
  | "runAudit"
  | "getAuditResults"
  | "sendChatMessage"
  | "getChatHistory"
  | "getSettings"
  | "saveSettings"
  | "suppressIssue"
  | "getTechStack"
  | "profileSaved"
  | "scoresUpdated"
  | "scanComplete"
  | "scanProgress"
  | "researchComplete"
  | "researchProgress"
  | "auditComplete"
  | "chatResponse"
  | "chatStreamChunk"
  | "error"
  | "settingsLoaded"
  | "profileLoaded"
  | "techStackDetected";

export interface WebviewMessage {
  type: WebviewMessageType;
  payload?: any;
}

// ─── Settings ───
export interface DraftAISettings {
  longcatApiKey: string;
  tavilyApiKey: string;
  scanIntervalMinutes: number;
  gitAwareScanning: boolean;
  enableCodeHealth: boolean;
  enableCompetitorInsights: boolean;
  enableUIAudit: boolean;
}
