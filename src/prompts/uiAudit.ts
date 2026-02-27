import type { ProjectProfile, TechStack } from "../types";

/**
 * UI/UX Audit prompts — THREE focused sub-prompts.
 * Each returns ONE score + its own findings.
 *
 * 1. Design Consistency — color, typography, spacing coherence
 * 2. Accessibility — WCAG compliance, aria, semantic HTML
 * 3. Structure — component hierarchy, error boundaries, loading states
 */

// ─── Types ───

export interface DesignTokens {
  colors: string[];
  fontSizes: string[];
  spacingValues: string[];
  fontFamilies: string[];
  borderRadii: string[];
}

export type AuditArea = "design" | "accessibility" | "structure";

// ─── Shared context builder ───

function buildProjectContext(profile: ProjectProfile, techStack?: TechStack): string {
  return `## Project Context
- **App**: ${profile.appDescription}
- **Target Users**: ${profile.targetUsers}
- **Design Intent**: ${profile.designIntent}
${techStack ? `- **CSS Approach**: ${techStack.cssApproach.join(", ") || "Vanilla CSS"}` : ""}
${techStack ? `- **Frameworks**: ${techStack.frameworks.join(", ")}` : ""}`;
}

// ─── Sub-Prompt 1: Design Consistency ───

/**
 * ONE TARGET: Score design consistency and find visual coherence issues.
 */
export function buildDesignAuditPrompt(
  profile: ProjectProfile,
  techStack?: TechStack,
  designTokens?: DesignTokens
): string {
  const tokenSection = designTokens
    ? `
## Extracted Design Tokens
- **Colors Used**: ${designTokens.colors.slice(0, 15).join(", ") || "None detected"}
- **Font Sizes**: ${designTokens.fontSizes.join(", ") || "None detected"}
- **Spacing Values**: ${designTokens.spacingValues.slice(0, 10).join(", ") || "None detected"}
- **Font Families**: ${designTokens.fontFamilies.join(", ") || "None detected"}
- **Border Radii**: ${designTokens.borderRadii.join(", ") || "None detected"}`
    : "";

  return `You are a senior UI designer and design systems expert.

${buildProjectContext(profile, techStack)}
${tokenSection}

## Your ONE Job: Score DESIGN CONSISTENCY (0-100)

Evaluate visual coherence across the codebase:
- Color palette harmony — are colors used consistently, or is it a random mix?
- Typography scale — are heading/body/caption sizes from a consistent scale?
- Spacing patterns — are padding/margin values from a consistent system (4px, 8px, 16px)?
- Border radius consistency — do buttons, cards, and inputs share the same radius?
- Component visual coherence — do UI elements look like they belong to the same app?

## Rules
1. Score objectively: 90-100 = excellent system, 70-89 = mostly consistent, 50-69 = inconsistent, <50 = chaotic
2. Reference actual files and CSS values — not generic advice
3. Align recommendations with the stated design intent
4. Maximum 8 findings — focus on the most impactful visual issues

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "score": 72,
  "findings": [
    {
      "area": "design",
      "title": "Inconsistent border radius",
      "description": "Buttons use 4px radius while cards use 12px. This creates visual dissonance.",
      "recommendation": "Standardize to 8px for interactive elements, 12px for containers.",
      "severity": "warning",
      "file": "src/components/Button.tsx",
      "line": 15
    }
  ]
}
\`\`\``;
}

// ─── Sub-Prompt 2: Accessibility ───

/**
 * ONE TARGET: Score accessibility compliance and find WCAG violations.
 */
export function buildAccessibilityAuditPrompt(
  profile: ProjectProfile,
  techStack?: TechStack
): string {
  return `You are a WCAG accessibility auditor. You evaluate web applications for accessibility compliance.

${buildProjectContext(profile, techStack)}

## Your ONE Job: Score ACCESSIBILITY (0-100)

Check for these WCAG violations:
- Missing \`alt\` props on images (WCAG 1.1.1)
- Missing \`aria-label\` or \`aria-labelledby\` on interactive elements (WCAG 4.1.2)
- Form fields without associated \`<label>\` elements (WCAG 1.3.1)
- Missing semantic HTML (\`<main>\`, \`<nav>\`, \`<header>\`, \`<footer>\`, \`<section>\`) (WCAG 1.3.1)
- Broken heading hierarchy — skipping levels like h1 → h3 (WCAG 1.3.1)
- Color contrast concerns if detectable from CSS values (WCAG 1.4.3)
- Missing keyboard navigation — onClick on divs without role/tabIndex (WCAG 2.1.1)
- Missing focus management for modals/dialogs (WCAG 2.4.3)

## Rules
1. Score: 90-100 = excellent a11y, 70-89 = good with minor gaps, 50-69 = significant issues, <50 = major barriers
2. Reference the specific WCAG criterion number (e.g., "WCAG 1.1.1") for each finding
3. Provide concrete fix code — not just "add alt text"
4. Maximum 8 findings

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "score": 55,
  "findings": [
    {
      "area": "accessibility",
      "title": "Images missing alt text (WCAG 1.1.1)",
      "description": "3 images found without alt attributes. Screen readers cannot describe these to users.",
      "recommendation": "Add descriptive alt: <img src='logo.png' alt='Company logo' />",
      "severity": "warning",
      "file": "src/components/Header.tsx",
      "line": 8
    }
  ]
}
\`\`\``;
}

// ─── Sub-Prompt 3: Structure ───

/**
 * ONE TARGET: Score component structure and find architectural issues.
 */
export function buildStructureAuditPrompt(
  profile: ProjectProfile,
  techStack?: TechStack
): string {
  return `You are a senior frontend architect who reviews component structure and patterns.

${buildProjectContext(profile, techStack)}

## Your ONE Job: Score COMPONENT STRUCTURE (0-100)

Evaluate the frontend architecture:
- Component hierarchy and reusability — are components focused and single-responsibility?
- Separation of concerns — are styles, logic, and markup properly separated?
- Missing error boundaries — can a child crash bring down the whole app?
- Missing loading states — do users see blank screens during data fetches?
- Missing empty states — what do lists show when there's no data?
- Prop drilling depth — are props passed through 3+ levels without Context?
- File organization — are related components co-located?

## Rules
1. Score: 90-100 = clean architecture, 70-89 = solid with improvements, 50-69 = needs refactoring, <50 = spaghetti
2. Be specific — name actual files and component patterns
3. Suggest concrete refactoring steps, not just "improve structure"
4. Maximum 8 findings

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "score": 80,
  "findings": [
    {
      "area": "structure",
      "title": "Missing error boundary",
      "description": "App.tsx renders children without any error boundary. A crash in any child will blank the screen.",
      "recommendation": "Wrap children: <ErrorBoundary fallback={<ErrorUI />}>{children}</ErrorBoundary>",
      "severity": "warning",
      "file": "src/App.tsx",
      "line": 12
    }
  ]
}
\`\`\``;
}

// ─── Comparison Prompt (unchanged target) ───

/**
 * ONE TARGET: Compare the developer's app against a reference website.
 */
export function buildComparisonPrompt(
  profile: ProjectProfile,
  referenceContent: string
): string {
  return `You are a UI/UX auditor. Compare the developer's frontend code against a reference website.

## Developer's Product
- **App**: ${profile.appDescription}
- **Design Intent**: ${profile.designIntent}

## Reference Website Content
${referenceContent.slice(0, 3000)}

## Your ONE Job
Compare the developer's code structure, styling approach, accessibility, and design patterns against what the reference website does well. Identify specific areas where the developer's implementation could improve.

## Response Format
Return **only** valid JSON — an array of findings:
\`\`\`json
[
  {
    "area": "design" | "accessibility" | "structure",
    "title": "Finding title",
    "description": "What the reference does better",
    "recommendation": "How to improve",
    "severity": "critical" | "warning" | "suggestion"
  }
]
\`\`\``;
}
