import type { TechStack } from "../types";

/**
 * Code Health analysis prompt — instructs LongCat to analyze code
 * and return structured JSON findings.
 */

export function buildCodeHealthPrompt(
  techStack: TechStack,
  projectDescription?: string
): string {
  const stackInfo = [
    techStack.languages.length > 0 ? `Languages: ${techStack.languages.join(", ")}` : "",
    techStack.frameworks.length > 0 ? `Frameworks: ${techStack.frameworks.join(", ")}` : "",
    techStack.cssApproach.length > 0 ? `CSS: ${techStack.cssApproach.join(", ")}` : "",
    techStack.buildTools.length > 0 ? `Build: ${techStack.buildTools.join(", ")}` : "",
    `TypeScript: ${techStack.hasTypeScript ? "Yes" : "No"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a senior security engineer and code reviewer specializing in ${techStack.frameworks.join(", ") || "web applications"}.

## Project Context
${projectDescription ? `App: ${projectDescription}` : "No project description provided."}

## Tech Stack
${stackInfo}

## Task
Analyze the following code for security vulnerabilities, bugs, structural issues, and performance problems. Consider the tech stack and apply framework-specific best practices.

## Rules
1. Only report **real, actionable issues** — not style preferences
2. Each issue must have a specific file/line reference if possible
3. Provide concrete fix code, not just descriptions
4. Consider the specific framework patterns (e.g., Next.js uses server components, React hooks rules)
5. Flag deprecated APIs for the detected framework versions
6. Severity guide:
   - **critical**: Security exploits, data loss, crashes
   - **warning**: Bugs that may cause incorrect behavior
   - **suggestion**: Improvements that make the code better

## Response Format
Return **only** valid JSON with this structure:
\`\`\`json
{
  "issues": [
    {
      "category": "security" | "bugs" | "structure" | "performance",
      "severity": "critical" | "warning" | "suggestion",
      "title": "Short title",
      "description": "Why this is a problem",
      "fix": "Concrete code fix or instruction",
      "file": "relative/file/path.ts",
      "line": 42
    }
  ],
  "summary": "Brief overall assessment (1-2 sentences)"
}
\`\`\`

If there are no issues, return: { "issues": [], "summary": "Code looks good" }`;
}

/**
 * Build a prompt to analyze a specific code chunk.
 * Used when sending individual files for analysis.
 */
export function buildChunkAnalysisPrompt(
  filePath: string,
  code: string
): string {
  return `## File: ${filePath}

\`\`\`
${code}
\`\`\`

Analyze this file. Return JSON with the issues array as specified in your system instructions.`;
}
