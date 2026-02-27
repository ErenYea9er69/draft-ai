import type { ProjectProfile, TechStack } from "../types";

/**
 * Competitor analysis prompts — each prompt has ONE target.
 * Prompt 1: Gap Analysis (feature matrix + market positioning)
 * Prompt 2: Roadmap (prioritized action plan)
 */

/**
 * Gap Analysis prompt — instructs LongCat to build a feature comparison matrix
 * and identify specific gaps, opportunities, and threats.
 *
 * ONE TARGET: Produce a structured competitive gap analysis.
 */
export function buildGapAnalysisPrompt(
  profile: ProjectProfile,
  techStack?: TechStack
): string {
  return `You are a product strategist who builds competitive analysis reports for software startups.

## Product Under Analysis
- **App**: ${profile.appDescription}
- **Target Users**: ${profile.targetUsers}
- **Current Features**: ${profile.currentFeatures}
- **Planned Features**: ${profile.plannedFeatures}
- **Design Intent**: ${profile.designIntent}
${techStack ? `- **Tech Stack**: ${techStack.frameworks.join(", ")} / ${techStack.languages.join(", ")}` : ""}

## Your ONE Job
Analyze the competitor research data provided and produce a **structured gap analysis**.

## How To Analyze
1. For each competitor, extract their **top 5 features**, **pricing**, and **one key weakness**
2. Build a mental feature comparison matrix: which features exist in competitors but NOT in this product?
3. Identify market gaps that NO competitor fills well
4. List threats that are hard to replicate (e.g., network effects, data moats, brand recognition)

## Rules
1. Be specific — reference actual features and real pricing tiers, not generic observations
2. Every "missing feature" must name at least one competitor that has it
3. Every "opportunity" must explain WHY no competitor fills it well
4. Consider the tech stack when evaluating feasibility of closing gaps
5. Don't repeat the competitor data verbatim — synthesize insights

## Example Output
\`\`\`json
{
  "competitorProfiles": [
    {
      "name": "Acme Inc",
      "strengths": ["Large user base", "Free tier with generous limits"],
      "weaknesses": ["No API access on free plan"],
      "features": ["Dashboard", "Team collaboration", "API", "Webhooks", "Custom domains"],
      "pricing": "Free / $12/mo Pro / $49/mo Team",
      "userSentiment": "Users love the UI but complain about slow support"
    }
  ],
  "missingFeatures": ["Real-time collaboration (offered by Acme and Beta)"],
  "opportunities": ["No competitor offers AI-powered onboarding — high demand in user forums"],
  "threats": ["Acme has 50K users and strong brand recognition"]
}
\`\`\`

## Response Format
Return **only** valid JSON matching the structure above.`;
}

/**
 * Roadmap prompt — builds a prioritized feature roadmap from gap analysis.
 *
 * ONE TARGET: Produce a ranked list of what to build next.
 */
export function buildRoadmapPrompt(
  profile: ProjectProfile,
  gapSummary: string,
  healthScore?: number
): string {
  return `You are a product strategist creating a prioritized roadmap for a software product.

## Product
- **App**: ${profile.appDescription}
- **Current Features**: ${profile.currentFeatures}
- **Planned Features**: ${profile.plannedFeatures}
${healthScore !== undefined ? `- **Code Health Score**: ${healthScore}/100` : ""}

## Competitive Gap Analysis
${gapSummary}

## Your ONE Job
Create a prioritized roadmap of the top 5-8 features to build next.

## Prioritization Criteria
1. **Impact**: How many users would benefit? Does it close a critical competitive gap?
2. **Effort**: Small (1-2 days), Medium (1-2 weeks), Large (1+ month)
3. **Urgency**: Is a competitor already winning because of this feature?
4. **Code health**: If health score is below 60, suggest a stabilization sprint FIRST

## Rules
1. Don't suggest features already in "Planned Features" unless they need reprioritization
2. Each item must have a clear rationale tied to competitive data
3. If health score is low, the first roadmap item should be "Technical debt sprint"
4. Be realistic about effort — don't mark everything as "small"

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
