import type { TechStack } from "../types";

/**
 * Code Health prompts — ONE prompt per category.
 * Each prompt has a single target: security, bugs, structure, or performance.
 */

export type HealthCategory = "security" | "bugs" | "structure" | "performance";

// ─── Few-Shot Examples (per category) ───

const FEW_SHOT: Record<HealthCategory, string> = {
  security: `
## Example Findings
\`\`\`json
{
  "issues": [
    {
      "category": "security",
      "severity": "critical",
      "title": "Hardcoded JWT secret",
      "description": "jwt_secret is hardcoded in the source. If committed, attackers can forge tokens.",
      "fix": "Move to environment variable: process.env.JWT_SECRET",
      "file": "src/auth/token.ts",
      "line": 12
    },
    {
      "category": "security",
      "severity": "warning",
      "title": "innerHTML assignment without sanitization",
      "description": "Direct innerHTML set from user input opens XSS vector.",
      "fix": "Sanitize with DOMPurify: element.innerHTML = DOMPurify.sanitize(input)",
      "file": "src/components/Comment.tsx",
      "line": 45
    }
  ],
  "summary": "2 security issues found — 1 critical credential exposure, 1 XSS risk."
}
\`\`\``,

  bugs: `
## Example Findings
\`\`\`json
{
  "issues": [
    {
      "category": "bugs",
      "severity": "warning",
      "title": "Promise .then() without .catch()",
      "description": "Unhandled promise rejection will crash the Node process in production.",
      "fix": "Add .catch(err => console.error(err)) or wrap in try/catch with async/await",
      "file": "src/api/users.ts",
      "line": 33
    },
    {
      "category": "bugs",
      "severity": "warning",
      "title": "JSON.parse without try/catch",
      "description": "If the input is malformed, this will throw an unhandled SyntaxError.",
      "fix": "Wrap in try/catch: try { JSON.parse(data) } catch(e) { /* fallback */ }",
      "file": "src/utils/config.ts",
      "line": 18
    }
  ],
  "summary": "2 bug-risk patterns found — both related to missing error handling."
}
\`\`\``,

  structure: `
## Example Findings
\`\`\`json
{
  "issues": [
    {
      "category": "structure",
      "severity": "suggestion",
      "title": "File has 520 lines",
      "description": "Large files are harder to review and maintain. Consider splitting by responsibility.",
      "fix": "Extract the validation logic (lines 200-350) into a validators.ts module.",
      "file": "src/services/order.ts",
      "line": 1
    },
    {
      "category": "structure",
      "severity": "suggestion",
      "title": "Component renders list without empty state",
      "description": "When items is empty, the component renders nothing — confusing for users.",
      "fix": "Add: {items.length === 0 ? <EmptyState /> : items.map(...)}",
      "file": "src/components/OrderList.tsx",
      "line": 24
    }
  ],
  "summary": "2 structural improvements — 1 large file, 1 missing empty state."
}
\`\`\``,

  performance: `
## Example Findings
\`\`\`json
{
  "issues": [
    {
      "category": "performance",
      "severity": "warning",
      "title": "useEffect without dependency array",
      "description": "This effect runs on every render, causing fetch storms and unnecessary API calls.",
      "fix": "Add dependencies: useEffect(() => { ... }, [userId]) or [] for mount-only",
      "file": "src/hooks/useProfile.ts",
      "line": 8
    },
    {
      "category": "performance",
      "severity": "warning",
      "title": "Full lodash import",
      "description": "Importing all of lodash (71KB) when only debounce is used.",
      "fix": "Use: import debounce from 'lodash/debounce'",
      "file": "src/utils/search.ts",
      "line": 1
    }
  ],
  "summary": "2 performance issues — 1 re-render loop, 1 heavy bundle import."
}
\`\`\``,
};

// ─── Category-Specific Instructions ───

const CATEGORY_INSTRUCTIONS: Record<HealthCategory, string> = {
  security: `## Your Sole Focus: SECURITY

Find ONLY security vulnerabilities:
- Hardcoded secrets (API keys, passwords, JWT secrets, private keys)
- XSS vectors (dangerouslySetInnerHTML, innerHTML without sanitization)
- SQL/NoSQL injection (string concatenation with user input in queries)
- Server-side env vars leaking to client bundles
- eval() or Function() with dynamic input
- Missing CSRF protection
- Insecure randomness (Math.random for tokens)
- Path traversal risks

Do NOT report:
- Code style issues
- Performance problems
- Missing tests
- Structural concerns`,

  bugs: `## Your Sole Focus: BUG PATTERNS

Find ONLY likely bugs and error-handling gaps:
- Unhandled promise rejections (.then without .catch, missing try/catch on await)
- JSON.parse without error handling
- Possible null/undefined dereferences
- Empty catch blocks (silently swallowed errors)
- Incorrect equality checks (== null, loose comparisons)
- Array delete (creates holes instead of splicing)
- Assignment to optional chain (?.prop = value)
- Missing return statements in functions that should return
- Debugger statements left in code
- TODO/FIXME/HACK comments indicating known bugs

Do NOT report:
- Security vulnerabilities
- Performance issues
- Code style preferences`,

  structure: `## Your Sole Focus: ARCHITECTURAL STRUCTURE

Find ONLY structural and maintainability issues:
- Files exceeding 400 lines — suggest how to split
- Functions exceeding 60 lines — suggest extraction
- Deep prop drilling (more than 3 levels without Context/store)
- Missing error boundaries in React component trees
- Data fetching without loading states
- List rendering without empty states
- Missing TypeScript types (any usage, untyped function params)
- Circular dependency patterns
- God components that do too many things
- Poor separation of concerns (UI mixed with business logic)

Do NOT report:
- Security issues
- Performance issues
- Simple bugs`,

  performance: `## Your Sole Focus: PERFORMANCE

Find ONLY performance anti-patterns:
- Heavy imports (moment.js, full lodash, full AWS SDK)
- useEffect without dependency array (re-runs every render)
- Inline arrow functions in JSX props (causes child re-renders)
- Inline style objects in JSX (new reference every render)
- Unthrottled scroll/resize/mousemove event listeners
- Synchronous file system operations (readFileSync in server code)
- setInterval without clearInterval on cleanup
- Missing React.memo on expensive pure components
- N+1 query patterns (await in a loop)
- Large bundle imports without code splitting

Do NOT report:
- Security vulnerabilities
- Bugs
- Structural issues`,
};

/**
 * Build a focused code health prompt for exactly ONE category.
 * Call this 4 times — once per category — for thorough results.
 */
export function buildCodeHealthPrompt(
  techStack: TechStack,
  category: HealthCategory,
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

  return `You are a senior ${category === "security" ? "security engineer" : category === "bugs" ? "QA engineer" : category === "structure" ? "software architect" : "performance engineer"} specializing in ${techStack.frameworks.join(", ") || "web applications"}.

## Project Context
${projectDescription ? `App: ${projectDescription}` : "No project description provided."}

## Tech Stack
${stackInfo}

${CATEGORY_INSTRUCTIONS[category]}

## Rules
1. Only report **real, actionable issues** — no style preferences, no nitpicks
2. Each issue MUST have a specific file path and line number
3. Provide concrete fix code, not just descriptions
4. Consider framework-specific patterns (e.g., React hooks rules, Next.js server components)
5. Do NOT report issues in test files, config files, or node_modules
6. Do NOT report issues inside comments or string literals
7. Maximum 10 issues per chunk — focus on the most impactful ones

## Severity Guide
- **critical**: Will cause crashes, data loss, security exploits, or corrupt state
- **warning**: May cause incorrect behavior under certain conditions
- **suggestion**: Would make the code meaningfully better

${FEW_SHOT[category]}

## Response Format
Return **only** valid JSON with this structure:
\`\`\`json
{
  "issues": [
    {
      "category": "${category}",
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

If there are no issues, return: { "issues": [], "summary": "No ${category} issues found." }`;
}

/**
 * Build a prompt to analyze a specific code chunk.
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

