import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type {
  ProjectProfile,
  TechStack,
  UIAuditResult,
  AuditFinding,
  IssueSeverity,
} from "../types";
import { LongCatService } from "./longcat";
import { TavilyService } from "./tavily";
import {
  buildUIAuditPrompt,
  buildComparisonPrompt,
  type DesignTokens,
} from "../prompts/uiAudit";

export interface AuditProgress {
  status: "parsing" | "analyzing" | "comparing" | "complete" | "error";
  message: string;
  progress?: number;
}

// ─── Regex patterns for local checks ───

const A11Y_PATTERNS = {
  imgNoAlt: /<img(?![^>]*\balt\b)[^>]*>/gi,
  imgEmptyAlt: /<img[^>]*alt=["']\s*["'][^>]*>/gi,
  jsxImgNoAlt: /<(?:img|Image)(?![^>]*\balt\b)[^/>]*\/?>/gi,
  inputNoLabel: /<input(?![^>]*aria-label)[^>]*>/gi,
  buttonNoLabel: /<button(?![^>]*aria-label)(?![^>]*>[^<]+<\/button>)[^>]*\/?\s*>/gi,
  noMainTag: /\bmain\b/i,
  noNavTag: /\bnav\b/i,
  dangerouslySetInnerHTML: /dangerouslySetInnerHTML/g,
  onClickDiv: /\<div[^>]*onClick/gi,
};

// ─── CSS value extraction patterns ───

const CSS_PATTERNS = {
  hexColor: /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g,
  rgbColor: /rgba?\s*\([^)]+\)/g,
  hslColor: /hsla?\s*\([^)]+\)/g,
  fontSize: /font-size\s*:\s*([^;]+)/gi,
  fontFamily: /font-family\s*:\s*([^;]+)/gi,
  padding: /padding(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/gi,
  margin: /margin(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/gi,
  borderRadius: /border-radius\s*:\s*([^;]+)/gi,
};

export class UIAuditorService {
  constructor(
    private longcat: LongCatService,
    private tavily: TavilyService,
    private workspaceRoot: string
  ) {}

  /**
   * Run a full UI/UX audit cycle.
   */
  async runAudit(
    profile: ProjectProfile,
    techStack: TechStack | undefined,
    comparisonUrl: string | undefined,
    onProgress: (progress: AuditProgress) => void
  ): Promise<UIAuditResult> {
    // 1. Parse frontend files — extract design tokens + run local checks
    onProgress({ status: "parsing", message: "Scanning frontend files...", progress: 10 });

    const frontendFiles = await this.findFrontendFiles();
    const designTokens = await this.extractDesignTokens(frontendFiles.styleFiles);
    const localFindings = await this.runLocalChecks(frontendFiles);

    // 2. AI-powered analysis
    onProgress({ status: "analyzing", message: "AI analyzing design coherence...", progress: 35 });

    let aiFindings: AuditFinding[] = [];
    let scores = { design: 0, accessibility: 0, structure: 0 };

    if (this.longcat.isReady()) {
      try {
        const codeSnapshot = await this.buildCodeSnapshot(frontendFiles);
        const prompt = buildUIAuditPrompt(profile, techStack, designTokens);

        const response = await this.longcat.chat(
          [
            { role: "system", content: prompt },
            { role: "user", content: codeSnapshot },
          ],
          { temperature: 0.1, maxTokens: 4000 }
        );

        const parsed = this.parseAuditResponse(response);
        aiFindings = parsed.findings;
        scores = {
          design: parsed.designConsistencyScore,
          accessibility: parsed.accessibilityScore,
          structure: parsed.structureScore,
        };
      } catch (err: any) {
        console.error("AI audit analysis failed:", err.message);
      }
    }

    // 3. URL comparison (optional)
    let comparisonFindings: AuditFinding[] = [];
    if (comparisonUrl && this.tavily.isReady() && this.longcat.isReady()) {
      onProgress({ status: "comparing", message: `Comparing with ${comparisonUrl}...`, progress: 70 });

      try {
        comparisonFindings = await this.runComparison(profile, comparisonUrl);
      } catch (err: any) {
        console.warn("URL comparison failed:", err.message);
      }
    }

    // 4. Merge all findings + compute scores
    const allFindings = this.mergeFindings(localFindings, aiFindings, comparisonFindings);

    // If AI didn't return scores, compute from local findings
    if (scores.design === 0 && scores.accessibility === 0 && scores.structure === 0) {
      scores = this.computeScoresFromFindings(allFindings);
    }

    const result: UIAuditResult = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      designConsistencyScore: scores.design,
      accessibilityScore: scores.accessibility,
      structureScore: scores.structure,
      findings: allFindings,
      comparedUrl: comparisonUrl,
    };

    onProgress({
      status: "complete",
      message: `Audit complete! Found ${allFindings.length} findings.`,
      progress: 100,
    });

    return result;
  }

  // ─── File Discovery ───

  private async findFrontendFiles(): Promise<{
    styleFiles: vscode.Uri[];
    componentFiles: vscode.Uri[];
    htmlFiles: vscode.Uri[];
  }> {
    const [styleFiles, componentFiles, htmlFiles] = await Promise.all([
      vscode.workspace.findFiles(
        "**/*.{css,scss,sass,less}",
        "**/node_modules/**",
        50
      ),
      vscode.workspace.findFiles(
        "**/*.{tsx,jsx,vue,svelte}",
        "**/node_modules/**",
        100
      ),
      vscode.workspace.findFiles(
        "**/*.{html,htm}",
        "**/node_modules/**",
        20
      ),
    ]);

    return { styleFiles, componentFiles, htmlFiles };
  }

  // ─── Design Token Extraction ───

  private async extractDesignTokens(styleFiles: vscode.Uri[]): Promise<DesignTokens> {
    const tokens: DesignTokens = {
      colors: [],
      fontSizes: [],
      spacingValues: [],
      fontFamilies: [],
      borderRadii: [],
    };

    const colorSet = new Set<string>();
    const fontSizeSet = new Set<string>();
    const spacingSet = new Set<string>();
    const fontFamilySet = new Set<string>();
    const borderRadiusSet = new Set<string>();

    for (const file of styleFiles.slice(0, 20)) {
      try {
        const content = fs.readFileSync(file.fsPath, "utf-8");

        // Extract colors
        const hexColors = content.match(CSS_PATTERNS.hexColor) ?? [];
        const rgbColors = content.match(CSS_PATTERNS.rgbColor) ?? [];
        const hslColors = content.match(CSS_PATTERNS.hslColor) ?? [];
        [...hexColors, ...rgbColors, ...hslColors].forEach((c) => colorSet.add(c.toLowerCase()));

        // Extract font sizes
        let match;
        const fsRegex = new RegExp(CSS_PATTERNS.fontSize.source, "gi");
        while ((match = fsRegex.exec(content)) !== null) {
          fontSizeSet.add(match[1].trim());
        }

        // Extract font families
        const ffRegex = new RegExp(CSS_PATTERNS.fontFamily.source, "gi");
        while ((match = ffRegex.exec(content)) !== null) {
          fontFamilySet.add(match[1].trim().replace(/['"]/g, ""));
        }

        // Extract spacing values (padding/margin)
        for (const pattern of [CSS_PATTERNS.padding, CSS_PATTERNS.margin]) {
          const spRegex = new RegExp(pattern.source, "gi");
          while ((match = spRegex.exec(content)) !== null) {
            spacingSet.add(match[1].trim());
          }
        }

        // Extract border radii
        const brRegex = new RegExp(CSS_PATTERNS.borderRadius.source, "gi");
        while ((match = brRegex.exec(content)) !== null) {
          borderRadiusSet.add(match[1].trim());
        }
      } catch {
        // Skip files that can't be read
      }
    }

    tokens.colors = Array.from(colorSet).slice(0, 30);
    tokens.fontSizes = Array.from(fontSizeSet).slice(0, 15);
    tokens.spacingValues = Array.from(spacingSet).slice(0, 20);
    tokens.fontFamilies = Array.from(fontFamilySet).slice(0, 10);
    tokens.borderRadii = Array.from(borderRadiusSet).slice(0, 10);

    return tokens;
  }

  // ─── Local Accessibility & Structure Checks ───

  private async runLocalChecks(files: {
    styleFiles: vscode.Uri[];
    componentFiles: vscode.Uri[];
    htmlFiles: vscode.Uri[];
  }): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const allMarkupFiles = [...files.componentFiles, ...files.htmlFiles];

    let hasMainTag = false;
    let hasNavTag = false;

    for (const file of allMarkupFiles.slice(0, 60)) {
      try {
        const content = fs.readFileSync(file.fsPath, "utf-8");
        const lines = content.split("\n");
        const relativePath = path.relative(this.workspaceRoot, file.fsPath);

        // Track semantic tags across all files
        if (A11Y_PATTERNS.noMainTag.test(content)) hasMainTag = true;
        if (A11Y_PATTERNS.noNavTag.test(content)) hasNavTag = true;

        // Check for images without alt
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (A11Y_PATTERNS.jsxImgNoAlt.test(line)) {
            A11Y_PATTERNS.jsxImgNoAlt.lastIndex = 0;
            findings.push({
              area: "accessibility",
              title: "Image missing alt text",
              description: `Image tag without \`alt\` attribute found.`,
              recommendation: "Add descriptive alt text for screen readers. Use alt=\"\" for decorative images.",
              severity: "warning",
              file: relativePath,
              line: i + 1,
            });
          }

          if (A11Y_PATTERNS.onClickDiv.test(line)) {
            A11Y_PATTERNS.onClickDiv.lastIndex = 0;
            findings.push({
              area: "accessibility",
              title: "Clickable div without semantics",
              description: "A `<div>` has an onClick handler but no `role` or keyboard support.",
              recommendation: "Use `<button>` instead, or add `role=\"button\"`, `tabIndex={0}`, and `onKeyDown`.",
              severity: "warning",
              file: relativePath,
              line: i + 1,
            });
          }

          if (A11Y_PATTERNS.dangerouslySetInnerHTML.test(line)) {
            A11Y_PATTERNS.dangerouslySetInnerHTML.lastIndex = 0;
            findings.push({
              area: "structure",
              title: "dangerouslySetInnerHTML usage",
              description: "Raw HTML injection can cause XSS vulnerabilities and accessibility issues.",
              recommendation: "Sanitize HTML with DOMPurify or use structured rendering instead.",
              severity: "critical",
              file: relativePath,
              line: i + 1,
            });
          }
        }

        // Check for missing loading/empty states in list components
        const isListComponent =
          /\.(map|forEach)\s*\(/.test(content) &&
          /\.tsx$|\.jsx$/.test(file.fsPath);
        if (isListComponent) {
          const hasEmptyState =
            /\.length\s*===?\s*0|isEmpty|no\s*data|emptyState|empty.state/i.test(content);
          const hasLoadingState =
            /loading|isLoading|spinner|skeleton|Loader/i.test(content);

          if (!hasEmptyState) {
            findings.push({
              area: "structure",
              title: "Missing empty state",
              description: "Component renders a list but has no empty state for when data is absent.",
              recommendation: "Add a check for empty arrays and render a helpful empty state message.",
              severity: "suggestion",
              file: relativePath,
            });
          }

          if (!hasLoadingState) {
            findings.push({
              area: "structure",
              title: "Missing loading state",
              description: "Component renders a list but has no visible loading indicator.",
              recommendation: "Add a loading skeleton or spinner while data is being fetched.",
              severity: "suggestion",
              file: relativePath,
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Global semantic checks
    if (!hasMainTag && allMarkupFiles.length > 0) {
      findings.push({
        area: "accessibility",
        title: "No <main> landmark found",
        description: "The application does not use a `<main>` element for its primary content.",
        recommendation: "Wrap the main content area in a `<main>` element for screen reader navigation.",
        severity: "warning",
      });
    }

    if (!hasNavTag && allMarkupFiles.length > 0) {
      findings.push({
        area: "accessibility",
        title: "No <nav> landmark found",
        description: "No `<nav>` element was found for navigation menus.",
        recommendation: "Wrap navigation links in a `<nav>` element with an `aria-label`.",
        severity: "suggestion",
      });
    }

    return findings;
  }

  // ─── Build Code Snapshot for AI ───

  private async buildCodeSnapshot(files: {
    styleFiles: vscode.Uri[];
    componentFiles: vscode.Uri[];
    htmlFiles: vscode.Uri[];
  }): Promise<string> {
    let snapshot = "# Frontend Code Snapshot\n\n";
    const allFiles = [
      ...files.styleFiles.slice(0, 5),
      ...files.componentFiles.slice(0, 15),
      ...files.htmlFiles.slice(0, 5),
    ];

    let totalTokens = 0;
    const MAX_TOKENS = 12000; // Stay well under context limit

    for (const file of allFiles) {
      if (totalTokens > MAX_TOKENS) break;

      try {
        const content = fs.readFileSync(file.fsPath, "utf-8");
        const relativePath = path.relative(this.workspaceRoot, file.fsPath);
        const truncated = content.slice(0, 2000);
        const approxTokens = Math.ceil(truncated.length / 4);

        snapshot += `## ${relativePath}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
        totalTokens += approxTokens;
      } catch {
        // Skip
      }
    }

    return snapshot;
  }

  // ─── URL Comparison ───

  private async runComparison(
    profile: ProjectProfile,
    url: string
  ): Promise<AuditFinding[]> {
    // Use Tavily to fetch the page content
    const searchResponse = await this.tavily.search(
      `site:${url} features design`,
      {
        searchDepth: "advanced",
        maxResults: 3,
        includeDomains: [new URL(url).hostname],
      }
    );

    const referenceContent = searchResponse.results
      .map((r) => `### ${r.title}\n${r.content}`)
      .join("\n\n");

    if (!referenceContent.trim()) {
      return [];
    }

    const prompt = buildComparisonPrompt(profile, referenceContent);
    const response = await this.longcat.chat(
      [
        { role: "system", content: prompt },
        { role: "user", content: `Compare the developer's app against the reference at: ${url}` },
      ],
      { temperature: 0.2, maxTokens: 2000 }
    );

    return this.parseComparisonFindings(response);
  }

  // ─── Response Parsers ───

  private parseAuditResponse(response: string): {
    designConsistencyScore: number;
    accessibilityScore: number;
    structureScore: number;
    findings: AuditFinding[];
  } {
    try {
      let json = response.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(json);
      return {
        designConsistencyScore: Math.min(100, Math.max(0, parsed.designConsistencyScore ?? 0)),
        accessibilityScore: Math.min(100, Math.max(0, parsed.accessibilityScore ?? 0)),
        structureScore: Math.min(100, Math.max(0, parsed.structureScore ?? 0)),
        findings: (parsed.findings ?? []).map((f: any) => ({
          area: f.area ?? "design",
          title: f.title ?? "Untitled finding",
          description: f.description ?? "",
          recommendation: f.recommendation ?? "",
          severity: (f.severity as IssueSeverity) ?? "suggestion",
          file: f.file,
          line: f.line,
        })),
      };
    } catch {
      return {
        designConsistencyScore: 0,
        accessibilityScore: 0,
        structureScore: 0,
        findings: [],
      };
    }
  }

  private parseComparisonFindings(response: string): AuditFinding[] {
    try {
      let json = response.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(json);
      const arr = Array.isArray(parsed) ? parsed : parsed.findings ?? [];
      return arr.map((f: any) => ({
        area: f.area ?? "design",
        title: f.title ?? "Untitled",
        description: f.description ?? "",
        recommendation: f.recommendation ?? "",
        severity: (f.severity as IssueSeverity) ?? "suggestion",
      }));
    } catch {
      return [];
    }
  }

  // ─── Merge & Deduplicate Findings ───

  private mergeFindings(
    local: AuditFinding[],
    ai: AuditFinding[],
    comparison: AuditFinding[]
  ): AuditFinding[] {
    const all = [...local, ...ai, ...comparison];

    // Basic dedup by title similarity
    const seen = new Set<string>();
    return all.filter((f) => {
      const key = `${f.area}:${f.title.toLowerCase().slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ─── Fallback Score Computation ───

  private computeScoresFromFindings(findings: AuditFinding[]): {
    design: number;
    accessibility: number;
    structure: number;
  } {
    const compute = (area: AuditFinding["area"]) => {
      const areaFindings = findings.filter((f) => f.area === area);
      if (areaFindings.length === 0) return 75; // Default when no issues

      let penalty = 0;
      for (const f of areaFindings) {
        if (f.severity === "critical") penalty += 15;
        else if (f.severity === "warning") penalty += 8;
        else penalty += 3;
      }

      return Math.max(0, 100 - penalty);
    };

    return {
      design: compute("design"),
      accessibility: compute("accessibility"),
      structure: compute("structure"),
    };
  }
}
