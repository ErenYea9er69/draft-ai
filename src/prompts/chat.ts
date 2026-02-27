import type {
  ProjectProfile,
  ScanResult,
  CompetitorResearchResult,
  UIAuditResult,
  TechStack,
} from "../types";

/**
 * Chat system prompt — dynamically switches expert personality
 * based on the active tab context.
 *
 * ONE TARGET: Be the best possible advisor for the topic at hand.
 */

// ─── Tab-Specific Expert Modes ───

const EXPERT_MODES: Record<string, string> = {
  health: `You are a **security-focused senior code reviewer**. Your priority is actionable fixes:
- When discussing code issues, provide exact code diffs (before/after)
- Reference specific CVE IDs when discussing vulnerabilities
- Suggest the minimum change needed to fix each issue
- If asked about structure, recommend specific refactoring steps with file paths`,

  competitor: `You are a **product strategist and competitive analyst**. Your priority is market-aware recommendations:
- Back up every recommendation with competitive data when available
- Frame features in terms of user value, not technical coolness
- When suggesting features, estimate effort (small/medium/large) and impact
- Reference specific competitors by name when making comparisons`,

  audit: `You are a **UI/UX design consultant** who knows WCAG guidelines by heart. Your priority is user experience:
- Reference specific WCAG criteria by number (e.g., "WCAG 1.4.3 Contrast")
- Suggest design tokens and systems, not one-off fixes
- When recommending a11y improvements, show the exact JSX/HTML fix
- Consider the stated design intent when making visual recommendations`,

  settings: `You are a **DevOps and configuration advisor**. Help the user set up and optimize their Draft AI configuration.`,
};

const DEFAULT_MODE = `You are a **senior full-stack engineer** who is also product-minded. You give specific, tailored advice — never generic.
- Reference actual files, patterns, and technologies from the project
- Provide code examples when helpful
- Consider both technical excellence AND user experience`;

/**
 * Build a dynamic system prompt for the chat interface.
 * Injects all available project context so the AI gives specific, tailored answers.
 */
export function buildChatSystemPrompt(opts: {
  profile?: ProjectProfile;
  scan?: ScanResult;
  competitor?: CompetitorResearchResult;
  audit?: UIAuditResult;
  techStack?: TechStack;
  activeTab?: string;
  activeFileContent?: string;
  activeFileName?: string;
}): string {
  const { profile, scan, competitor, audit, techStack, activeTab, activeFileContent, activeFileName } = opts;

  // Pick the right expert mode based on the active tab
  const expertMode = (activeTab && EXPERT_MODES[activeTab]) || DEFAULT_MODE;

  let prompt = `You are Draft AI — a senior developer, product strategist, and security auditor built into the developer's code editor. You have deep knowledge of their project and codebase.

${expertMode}

Format responses in Markdown. Be concise but thorough.`;

  // ── Tech Stack Context ──
  if (techStack) {
    prompt += `\n\n## Tech Stack
- **Languages**: ${techStack.languages.join(", ") || "Unknown"}
- **Frameworks**: ${techStack.frameworks.join(", ") || "None detected"}
- **Build Tools**: ${techStack.buildTools.join(", ") || "None detected"}
- **TypeScript**: ${techStack.hasTypeScript ? "Yes" : "No"}
- **CSS**: ${techStack.cssApproach.join(", ") || "Unknown"}`;
  }

  // ── Project Profile ──
  if (profile) {
    prompt += `\n\n## Project Profile
- **App**: ${profile.appDescription}
- **Target Users**: ${profile.targetUsers}
- **Current Features**: ${profile.currentFeatures}
- **Planned Features**: ${profile.plannedFeatures}
- **Competitors**: ${profile.competitors?.join(", ") ?? "None listed"}
- **Design Intent**: ${profile.designIntent}`;
  }

  // ── Code Health Summary ──
  if (scan) {
    const criticalCount = scan.issues?.filter(
      (i) => i.severity === "critical" && !i.suppressed
    ).length ?? 0;
    const warningCount = scan.issues?.filter(
      (i) => i.severity === "warning" && !i.suppressed
    ).length ?? 0;
    prompt += `\n\n## Latest Code Health Scan
- **Health Score**: ${scan.healthScore}/100
- **Critical Issues**: ${criticalCount}
- **Warnings**: ${warningCount}
- **Files Scanned**: ${scan.filesScanned}
- **Last Scan**: ${scan.timestamp}`;

    // Include top critical issues for context
    const topCritical = scan.issues
      ?.filter((i) => i.severity === "critical" && !i.suppressed)
      .slice(0, 5);
    if (topCritical && topCritical.length > 0) {
      prompt += `\n\n### Top Critical Issues`;
      for (const issue of topCritical) {
        prompt += `\n- **${issue.title}** in \`${issue.file}\` (line ${issue.line}): ${issue.description}`;
      }
    }
  }

  // ── Competitor Research Summary ──
  if (competitor) {
    prompt += `\n\n## Latest Competitor Research
- **Competitive Score**: ${competitor.competitiveScore}/100
- **Missing Features**: ${competitor.gapAnalysis?.missingFeatures?.join(", ") ?? "None"}
- **Opportunities**: ${competitor.gapAnalysis?.opportunities?.join(", ") ?? "None"}`;
  }

  // ── UI Audit Summary ──
  if (audit) {
    prompt += `\n\n## Latest UI Audit
- **Design Consistency**: ${audit.designConsistencyScore}/100
- **Accessibility**: ${audit.accessibilityScore}/100
- **Structure**: ${audit.structureScore}/100
- **Total Findings**: ${audit.findings?.length ?? 0}`;
  }

  // ── Active File Context ──
  if (activeFileName && activeFileContent) {
    const truncated = activeFileContent.slice(0, 3000);
    prompt += `\n\n## Currently Open File: \`${activeFileName}\`
\`\`\`
${truncated}
\`\`\`
> The user has this file open. When relevant, reference it directly in your answers.`;
  }

  // ── Active Tab Context ──
  if (activeTab && activeTab !== "chat") {
    const tabLabels: Record<string, string> = {
      health: "Code Health",
      competitor: "Competitor Insights",
      audit: "UI/UX Audit",
      settings: "Settings",
    };
    prompt += `\n\n> The user is currently viewing the **${tabLabels[activeTab] ?? activeTab}** tab. Prioritize answers about that topic.`;
  }

  return prompt;
}
