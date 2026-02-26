import type { ProjectProfile, TechStack } from "../types";

/**
 * UI/UX Audit prompt — instructs LongCat to score design consistency,
 * accessibility, and structural quality from extracted design tokens
 * and component data.
 */

export function buildUIAuditPrompt(
  profile: ProjectProfile,
  techStack?: TechStack,
  designTokens?: DesignTokens
): string {
  const tokenSection = designTokens
    ? `
## Extracted Design Tokens
- **Colors**: ${designTokens.colors.join(", ") || "None detected"}
- **Font Sizes**: ${designTokens.fontSizes.join(", ") || "None detected"}
- **Spacing Values**: ${designTokens.spacingValues.join(", ") || "None detected"}
- **Font Families**: ${designTokens.fontFamilies.join(", ") || "None detected"}
- **Border Radii**: ${designTokens.borderRadii.join(", ") || "None detected"}`
    : "";

  return `You are a senior UI/UX auditor and design systems expert. Analyze frontend code for design consistency, accessibility compliance, and structural quality.

## Project Context
- **App**: ${profile.appDescription}
- **Target Users**: ${profile.targetUsers}
- **Design Intent**: ${profile.designIntent}
${techStack ? `- **CSS Approach**: ${techStack.cssApproach.join(", ") || "Vanilla CSS"}` : ""}
${techStack ? `- **Frameworks**: ${techStack.frameworks.join(", ")}` : ""}
${tokenSection}

## Analysis Areas

### 1. Design Consistency (0-100)
- Color palette harmony and usage consistency
- Typography scale consistency (headings, body, captions)
- Spacing and layout patterns (consistent padding/margin)
- Border radius, shadow, and decoration consistency
- Component visual coherence (do buttons, cards, inputs share a style language?)

### 2. Accessibility (0-100)
- Missing \`alt\` props on images
- Missing \`aria-label\` or \`aria-labelledby\` on interactive elements
- Form fields without associated labels
- Lack of semantic HTML (\`<main>\`, \`<nav>\`, \`<header>\`, \`<footer>\`, \`<section>\`)
- Missing heading hierarchy (h1 → h2 → h3)
- Color contrast concerns (if detectable from CSS values)
- Missing keyboard navigation patterns
- Missing \`role\` attributes on custom interactive elements

### 3. Structure (0-100)
- Component hierarchy and reusability
- Separation of concerns (styles vs. logic vs. markup)
- Missing error boundaries in React apps
- Missing loading states / skeleton screens
- Missing empty states for lists/tables
- Consistent file/folder organization
- Prop drilling depth (deep prop passing without context)

## Rules
1. Score each area objectively. 100 = exemplary, 0 = completely failing
2. Be specific — reference actual files and patterns, not generic advice
3. Align recommendations with the stated design intent
4. Prioritize findings by impact on user experience
5. For each finding, give a concrete fix, not just a description

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "designConsistencyScore": 72,
  "accessibilityScore": 55,
  "structureScore": 80,
  "findings": [
    {
      "area": "design" | "accessibility" | "structure",
      "title": "Inconsistent border radius",
      "description": "Buttons use 4px radius while cards use 12px. This creates visual dissonance.",
      "recommendation": "Standardize to 8px for all interactive elements, 12px for containers.",
      "severity": "warning",
      "file": "src/components/Button.tsx",
      "line": 15
    }
  ]
}
\`\`\``;
}

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

## Task
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

// ─── Types used by the prompt builder ───

export interface DesignTokens {
  colors: string[];
  fontSizes: string[];
  spacingValues: string[];
  fontFamilies: string[];
  borderRadii: string[];
}
