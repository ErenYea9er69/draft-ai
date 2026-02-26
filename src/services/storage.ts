import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import type {
  ProjectProfile,
  ScanResult,
  CompetitorResearchResult,
  UIAuditResult,
  ChatMessage,
  ConfidenceScores,
  DraftAISettings,
} from "../types";

const KEYS = {
  profile: "draftai.projectProfile",
  scanHistory: "draftai.scanHistory",
  competitorResults: "draftai.competitorResults",
  auditResults: "draftai.auditResults",
  chatHistory: "draftai.chatHistory",
  suppressedIssues: "draftai.suppressedIssues",
  scores: "draftai.scores",
  weeklyData: "draftai.weeklyData",
};

export class StorageService {
  constructor(
    private globalState: vscode.Memento,
    private workspaceState: vscode.Memento
  ) {}

  // ─── Project Profile ───

  getProfile(): ProjectProfile | undefined {
    return this.workspaceState.get<ProjectProfile>(KEYS.profile);
  }

  async saveProfile(profile: ProjectProfile): Promise<void> {
    profile.updatedAt = new Date().toISOString();
    await this.workspaceState.update(KEYS.profile, profile);
  }

  hasProfile(): boolean {
    return this.getProfile() !== undefined;
  }

  // ─── Scan History ───

  getScanHistory(): ScanResult[] {
    return this.workspaceState.get<ScanResult[]>(KEYS.scanHistory) ?? [];
  }

  async saveScanResult(result: ScanResult): Promise<void> {
    const history = this.getScanHistory();
    history.unshift(result);
    // Keep last 50 scans
    if (history.length > 50) history.length = 50;
    await this.workspaceState.update(KEYS.scanHistory, history);
  }

  getLatestScan(): ScanResult | undefined {
    const history = this.getScanHistory();
    return history.length > 0 ? history[0] : undefined;
  }

  // ─── Competitor Research ───

  getCompetitorResults(): CompetitorResearchResult | undefined {
    return this.workspaceState.get<CompetitorResearchResult>(KEYS.competitorResults);
  }

  async saveCompetitorResults(result: CompetitorResearchResult): Promise<void> {
    await this.workspaceState.update(KEYS.competitorResults, result);
  }

  // ─── UI Audit ───

  getAuditResults(): UIAuditResult | undefined {
    return this.workspaceState.get<UIAuditResult>(KEYS.auditResults);
  }

  async saveAuditResults(result: UIAuditResult): Promise<void> {
    await this.workspaceState.update(KEYS.auditResults, result);
  }

  // ─── Chat History ───

  getChatHistory(): ChatMessage[] {
    return this.workspaceState.get<ChatMessage[]>(KEYS.chatHistory) ?? [];
  }

  async addChatMessage(message: ChatMessage): Promise<void> {
    const history = this.getChatHistory();
    history.push(message);
    // Keep last 100 messages
    if (history.length > 100) history.splice(0, history.length - 100);
    await this.workspaceState.update(KEYS.chatHistory, history);
  }

  async clearChatHistory(): Promise<void> {
    await this.workspaceState.update(KEYS.chatHistory, []);
  }

  // ─── Suppressed Issues ───

  getSuppressedIssues(): string[] {
    return this.workspaceState.get<string[]>(KEYS.suppressedIssues) ?? [];
  }

  async suppressIssue(issueId: string): Promise<void> {
    const suppressed = this.getSuppressedIssues();
    if (!suppressed.includes(issueId)) {
      suppressed.push(issueId);
      await this.workspaceState.update(KEYS.suppressedIssues, suppressed);
    }
  }

  // ─── Confidence Scores ───

  getScores(): ConfidenceScores {
    return this.workspaceState.get<ConfidenceScores>(KEYS.scores) ?? {
      codeHealth: 0,
      uiConsistency: 0,
      competitivePosition: 0,
    };
  }

  async saveScores(scores: ConfidenceScores): Promise<void> {
    await this.workspaceState.update(KEYS.scores, scores);
  }

  // ─── Settings (from VS Code config) ───

  getSettings(): DraftAISettings {
    const config = vscode.workspace.getConfiguration("draftai");
    return {
      longcatApiKey: config.get("longcatApiKey", ""),
      tavilyApiKey: config.get("tavilyApiKey", ""),
      scanIntervalMinutes: config.get("scanIntervalMinutes", 30),
      gitAwareScanning: config.get("gitAwareScanning", true),
      enableCodeHealth: config.get("enableCodeHealth", true),
      enableCompetitorInsights: config.get("enableCompetitorInsights", true),
      enableUIAudit: config.get("enableUIAudit", true),
      enableTeamMode: config.get("enableTeamMode", false),
    };
  }

  async saveSetting(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration("draftai");
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  // ─── Team Mode ───

  async exportTeamConfig(workspaceRoot: string): Promise<void> {
    if (!workspaceRoot) return;

    const profile = this.getProfile();
    const suppressed = this.getSuppressedIssues();
    const scores = this.getScores();

    const teamConfig = {
      $schema: "https://draftai.dev/schema/v1",
      profile: profile ?? null,
      suppressedIssues: suppressed,
      scores,
      exportedAt: new Date().toISOString(),
    };

    const filePath = path.join(workspaceRoot, ".draftai.json");
    fs.writeFileSync(filePath, JSON.stringify(teamConfig, null, 2), "utf-8");
  }

  async importTeamConfig(workspaceRoot: string): Promise<boolean> {
    if (!workspaceRoot) return false;

    const filePath = path.join(workspaceRoot, ".draftai.json");
    if (!fs.existsSync(filePath)) return false;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const config = JSON.parse(content);

      if (config.profile) {
        await this.saveProfile(config.profile);
      }
      if (Array.isArray(config.suppressedIssues)) {
        for (const id of config.suppressedIssues) {
          await this.suppressIssue(id);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  teamConfigExists(workspaceRoot: string): boolean {
    if (!workspaceRoot) return false;
    return fs.existsSync(path.join(workspaceRoot, ".draftai.json"));
  }
}
