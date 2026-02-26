import type { ProjectProfile, TechStack } from "../types";

/**
 * Competitor analysis prompt — instructs LongCat to synthesize
 * search results into structured gap analysis and roadmap.
 */

export function buildGapAnalysisPrompt(
  profile: ProjectProfile,
  techStack?: TechStack
): string {
  return `You are a product strategist specializing in competitive analysis for software products.

## Product Under Analysis
- **App**: ${profile.appDescription}
- **Target Users**: ${profile.targetUsers}
- **Current Features**: ${profile.currentFeatures}
- **Planned Features**: ${profile.plannedFeatures}
- **Design Intent**: ${profile.designIntent}
${techStack ? `- **Tech Stack**: ${techStack.frameworks.join(", ")} / ${techStack.languages.join(", ")}` : ""}

## Task
Analyze the competitor research data provided and produce a structured gap analysis. Compare each competitor against this product.

## Rules
1. Be specific — reference actual features and pricing, not generic observations
2. Focus on actionable gaps the developer can close
3. Consider the tech stack when evaluating feasibility
4. Prioritize opportunities by impact × effort
5. Don't repeat the competitor data verbatim — synthesize insights

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "competitorProfiles": [
    {
      "name": "Competitor Name",
      "strengths": ["specific strength 1"],
      "weaknesses": ["specific weakness 1"],
      "features": ["feature 1", "feature 2"],
      "pricing": "Free / $X/mo",
      "userSentiment": "Brief summary of user reviews"
    }
  ],
  "missingFeatures": ["Feature your product lacks that competitors have"],
  "opportunities": ["Gaps no competitor fills well"],
  "threats": ["Competitor advantages that are hard to replicate"]
}
\`\`\``;
}

export function buildRoadmapPrompt(
  profile: ProjectProfile,
  gapAnalysisJson: string,
  healthScore?: number
): string {
  return `You are a product strategist creating an actionable roadmap for a software product.

## Product
- **App**: ${profile.appDescription}
- **Current Features**: ${profile.currentFeatures}
- **Planned Features**: ${profile.plannedFeatures}
${healthScore !== undefined ? `- **Code Health Score**: ${healthScore}/100` : ""}

## Gap Analysis
${gapAnalysisJson}

## Task
Based on the gap analysis, create a prioritized roadmap of features to build next. Consider:
1. What competitors offer that this product doesn't
2. What opportunities no competitor addresses well
3. What the planned features already cover (don't duplicate)
4. Code health — if score is low, suggest stabilization before new features

## Response Format
Return **only** valid JSON:
\`\`\`json
{
  "roadmap": [
    {
      "title": "Feature name",
      "description": "What to build and why",
      "priority": "high" | "medium" | "low",
      "effort": "small" | "medium" | "large",
      "rationale": "Why this matters based on competitive data"
    }
  ],
  "competitiveScore": 65
}
\`\`\`

The \`competitiveScore\` (0-100) represents how well the product currently competes. 100 = market leader, 0 = no competitive position.`;
}
