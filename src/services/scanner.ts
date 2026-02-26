import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";
import type { CodeIssue, ScanResult, TechStack, ProjectProfile } from "../types";
import { analyzeSecurityIssues } from "../analyzers/security";
import { analyzeBugIssues } from "../analyzers/bugs";
import { analyzeStructureIssues } from "../analyzers/structure";
import { analyzePerformanceIssues } from "../analyzers/performance";
import { LongCatService } from "./longcat";
import { GitService } from "./git";
import { OSVService } from "./osv";
import { buildCodeHealthPrompt, buildChunkAnalysisPrompt } from "../prompts/codeHealth";

/** Max file size to analyze (100KB) */
const MAX_FILE_SIZE = 100_000;
/** Max tokens per AI chunk */
const MAX_CHUNK_TOKENS = 4000;
/** Approx chars per token */
const CHARS_PER_TOKEN = 4;
/** File extensions to scan */
const SCANNABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte",
  ".py", ".rb", ".go", ".rs", ".java", ".php",
  ".css", ".scss", ".html",
]);

export interface ScanProgress {
  status: "starting" | "local" | "ai" | "cve" | "complete" | "error";
  message: string;
  progress?: number; // 0-100
}

export class ScannerService {
  constructor(
    private longcat: LongCatService,
    private git: GitService,
    private osv: OSVService,
    private workspaceRoot: string
  ) {}

  /**
   * Run a full code health scan.
   */
  async runScan(
    techStack: TechStack,
    profile: ProjectProfile | undefined,
    gitAware: boolean,
    onProgress: (progress: ScanProgress) => void
  ): Promise<ScanResult> {
    const startTime = Date.now();

    onProgress({ status: "starting", message: "Gathering files...", progress: 0 });

    // 1. Determine which files to scan
    let filesToScan: string[];
    if (gitAware && await this.git.isGitRepo()) {
      const changedFiles = await this.git.getChangedFiles();
      filesToScan = changedFiles
        .map((f) => path.join(this.workspaceRoot, f))
        .filter((f) => this.isScannableFile(f));

      // If no changed files, scan all source files
      if (filesToScan.length === 0) {
        filesToScan = await this.getAllSourceFiles();
      }
    } else {
      filesToScan = await this.getAllSourceFiles();
    }

    onProgress({
      status: "local",
      message: `Running local analyzers on ${filesToScan.length} files...`,
      progress: 10,
    });

    // 2. Run local analyzers (instant, free)
    const localIssues: CodeIssue[] = [];
    for (const filePath of filesToScan) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content.length > MAX_FILE_SIZE) continue;

        const relPath = path.relative(this.workspaceRoot, filePath);

        localIssues.push(
          ...analyzeSecurityIssues(relPath, content),
          ...analyzeBugIssues(relPath, content),
          ...analyzeStructureIssues(relPath, content, this.workspaceRoot),
          ...analyzePerformanceIssues(relPath, content)
        );
      } catch {
        // Skip unreadable files
      }
    }

    onProgress({
      status: "local",
      message: `Local analysis found ${localIssues.length} issues. Running AI analysis...`,
      progress: 40,
    });

    // 3. Run AI-powered analysis (if API key configured)
    let aiIssues: CodeIssue[] = [];
    if (this.longcat.isReady()) {
      try {
        aiIssues = await this.runAIAnalysis(filesToScan, techStack, profile, onProgress);
      } catch (err: any) {
        console.warn("AI analysis failed:", err.message);
        onProgress({
          status: "ai",
          message: `AI analysis skipped: ${err.message}`,
          progress: 70,
        });
      }
    } else {
      onProgress({
        status: "ai",
        message: "AI analysis skipped (no API key). Add your LongCat key in Settings.",
        progress: 70,
      });
    }

    // 4. Run CVE checks
    onProgress({ status: "cve", message: "Checking for known vulnerabilities...", progress: 80 });
    let cveIssues: CodeIssue[] = [];
    try {
      cveIssues = await this.osv.scanDependencies(this.workspaceRoot);
    } catch (err: any) {
      console.warn("CVE check failed:", err.message);
    }

    // 5. Merge and deduplicate
    const allIssues = this.deduplicateIssues([...localIssues, ...aiIssues, ...cveIssues]);

    // 6. Compute health score
    const healthScore = this.computeHealthScore(allIssues);

    const result: ScanResult = {
      id: `scan-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      issues: allIssues,
      healthScore,
      techStack,
      filesScanned: filesToScan.length,
      scanDurationMs: Date.now() - startTime,
    };

    onProgress({
      status: "complete",
      message: `Scan complete! Found ${allIssues.length} issues. Health score: ${healthScore}/100`,
      progress: 100,
    });

    return result;
  }

  /**
   * AI-powered analysis using LongCat.
   * Chunks files and sends each chunk for analysis.
   */
  private async runAIAnalysis(
    files: string[],
    techStack: TechStack,
    profile: ProjectProfile | undefined,
    onProgress: (progress: ScanProgress) => void
  ): Promise<CodeIssue[]> {
    const systemPrompt = buildCodeHealthPrompt(techStack, profile?.appDescription);
    const issues: CodeIssue[] = [];

    // Build file chunks (group small files together, split large files)
    const chunks = this.buildChunks(files);

    for (let i = 0; i < chunks.length; i++) {
      onProgress({
        status: "ai",
        message: `AI analyzing chunk ${i + 1}/${chunks.length}...`,
        progress: 40 + Math.round((i / chunks.length) * 30),
      });

      try {
        const response = await this.longcat.analyze(systemPrompt, chunks[i]);

        // Parse JSON response
        const parsed = this.parseAIResponse(response);
        if (parsed.issues) {
          for (const issue of parsed.issues) {
            issues.push({
              id: `ai-${randomUUID().slice(0, 8)}`,
              file: issue.file || "unknown",
              line: issue.line || 1,
              category: issue.category || "bugs",
              severity: issue.severity || "suggestion",
              title: issue.title || "AI Finding",
              description: issue.description || "",
              fix: issue.fix || "",
              suppressed: false,
            });
          }
        }
      } catch (err: any) {
        console.warn(`AI chunk ${i + 1} failed:`, err.message);
      }
    }

    return issues;
  }

  /**
   * Group files into chunks for AI analysis.
   */
  private buildChunks(files: string[]): string[] {
    const chunks: string[] = [];
    let currentChunk = "";
    const maxChars = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content.length > MAX_FILE_SIZE) continue;

        const relPath = path.relative(this.workspaceRoot, filePath);
        const fileBlock = buildChunkAnalysisPrompt(relPath, content);

        if (currentChunk.length + fileBlock.length > maxChars) {
          if (currentChunk) chunks.push(currentChunk);
          // If single file exceeds chunk size, truncate it
          currentChunk = fileBlock.length > maxChars
            ? fileBlock.slice(0, maxChars)
            : fileBlock;
        } else {
          currentChunk += "\n\n" + fileBlock;
        }
      } catch {
        // Skip unreadable
      }
    }

    if (currentChunk) chunks.push(currentChunk);

    // Cap at 10 chunks to stay within token budget
    return chunks.slice(0, 10);
  }

  /**
   * Parse the AI response JSON, handling markdown code blocks.
   */
  private parseAIResponse(response: string): { issues: any[]; summary?: string } {
    try {
      // Strip markdown code block markers if present
      let json = response.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(json);
    } catch {
      console.warn("Failed to parse AI response as JSON");
      return { issues: [] };
    }
  }

  /**
   * Deduplicate issues based on file + line + title similarity.
   */
  private deduplicateIssues(issues: CodeIssue[]): CodeIssue[] {
    const seen = new Set<string>();
    return issues.filter((issue) => {
      const key = `${issue.file}:${issue.line}:${issue.title.toLowerCase().slice(0, 30)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Compute a 0-100 health score based on issue severity.
   */
  private computeHealthScore(issues: CodeIssue[]): number {
    const active = issues.filter((i) => !i.suppressed);
    if (active.length === 0) return 100;

    let penalty = 0;
    for (const issue of active) {
      switch (issue.severity) {
        case "critical": penalty += 15; break;
        case "warning": penalty += 5; break;
        case "suggestion": penalty += 1; break;
      }
    }

    return Math.max(0, 100 - penalty);
  }

  /**
   * Get all scannable source files in the workspace.
   */
  private async getAllSourceFiles(): Promise<string[]> {
    try {
      const files = await vscode.workspace.findFiles(
        "**/*.{ts,tsx,js,jsx,vue,svelte,py,rb,go,rs,java,php,css,scss,html}",
        "**/node_modules/**",
        500 // Cap at 500 files
      );
      return files
        .map((f) => f.fsPath)
        .filter((f) => this.isScannableFile(f));
    } catch {
      return [];
    }
  }

  private isScannableFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return SCANNABLE_EXTENSIONS.has(ext);
  }
}
