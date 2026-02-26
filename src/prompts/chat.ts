import type {
  ProjectProfile,
  ScanResult,
  CompetitorResearchResult,
  UIAuditResult,
  TechStack,
} from "../types";

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
}): string {
  const { profile, scan, competitor, audit, techStack, activeTab } = opts;

  let prompt = `You are Draft AI — a senior developer, product strategist, and security auditor built into the developer's code editor. You have deep knowledge of their project and codebase.

Answer questions directly and specifically. Reference the project's actual code, tech stack, features, and goals. Don't give generic advice — every answer should be tailored to THIS project.

Be concise but thorough. Use code examples when helpful. Format responses in Markdown.`;

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
