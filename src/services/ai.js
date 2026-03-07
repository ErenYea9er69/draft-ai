/**
 * LongCat AI Service
 * Uses LongCat Flash Thinking for the 11-phase startup analysis
 */

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';

/**
 * The full 11-phase analysis prompt (baked in)
 */
function buildPrompt(idea, researchData) {
    return `Act as a **ruthless startup validator, venture capital analyst, competitive intelligence researcher, and market strategist**.

Your goal is to **stress-test this startup idea** like a top-tier consulting firm (McKinsey/BCG) combined with a venture capital investment committee.

Do NOT be optimistic by default. **Find weaknesses, risks, and hidden challenges.**

## THE STARTUP IDEA:
${idea}

## LIVE MARKET RESEARCH DATA (from web search):
${researchData}

---

Analyze this idea using ALL of the following phases. Your response MUST be valid JSON matching the exact structure below. Do NOT include any text before or after the JSON. Return ONLY the JSON object.

{
  "phases": {
    "problem_reality": {
      "title": "Problem Reality Test",
      "score": <0-10>,
      "who_experiences": "<who>",
      "frequency": "<how often>",
      "pain_level": "<1-10 with explanation>",
      "current_workarounds": "<list>",
      "users_pay_already": "<yes/no with detail>",
      "classification": "<Must-have | Painkiller | Nice-to-have | Vitamin>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "market_size": {
      "title": "Market Size Analysis",
      "score": <0-10>,
      "tam": "<Total Addressable Market estimate>",
      "sam": "<Serviceable Addressable Market>",
      "som": "<Serviceable Obtainable Market>",
      "opportunity_scale": "<Niche | Medium | Large-scale>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "customer_segmentation": {
      "title": "Customer Segmentation",
      "score": null,
      "primary_segments": "<list of segments>",
      "early_adopters": "<who>",
      "most_likely_to_pay": "<who>",
      "industries_affected": "<list>",
      "recommended_first_target": "<segment>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "competitive_intelligence": {
      "title": "Competitive Intelligence",
      "score": <0-10>,
      "competitors": [
        {
          "name": "<competitor>",
          "features": "<core features>",
          "pricing": "<model>",
          "strengths": "<list>",
          "weaknesses": "<list>",
          "positioning": "<description>"
        }
      ],
      "market_status": "<Empty | Emerging | Competitive | Saturated | Red ocean>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "switching_cost": {
      "title": "Switching Cost & User Behavior",
      "score": null,
      "habit_lockin": "<assessment>",
      "workflow_dependency": "<assessment>",
      "integrations": "<assessment>",
      "data_migration": "<assessment>",
      "brand_loyalty": "<assessment>",
      "realistic_adoption": "<yes/no with explanation>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "distribution": {
      "title": "Distribution & Go-To-Market",
      "score": <0-10>,
      "channels": "<list of channels>",
      "viral_loops": "<assessment>",
      "seo_potential": "<assessment>",
      "community_growth": "<assessment>",
      "paid_acquisition": "<assessment>",
      "best_strategy": "<recommended approach>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "build_feasibility": {
      "title": "Build Feasibility",
      "score": <0-10>,
      "product_type": "<SaaS | Web App | Mobile | API | AI Tool | Automation>",
      "engineering_complexity": "<Low | Medium | High | Very High>",
      "infrastructure": "<requirements>",
      "integrations_needed": "<list>",
      "scaling_challenges": "<assessment>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "economic_model": {
      "title": "Economic Model",
      "score": null,
      "pricing_models": "<list of possible models>",
      "avg_customer_value": "<estimate>",
      "retention_potential": "<Low | Medium | High>",
      "margins": "<estimate>",
      "revenue_scalability": "<assessment>",
      "business_type": "<Lifestyle SaaS | Profitable Niche | Venture-scale>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "moat": {
      "title": "Moat & Defensibility",
      "score": <0-10>,
      "network_effects": "<assessment>",
      "data_advantage": "<assessment>",
      "switching_costs_moat": "<assessment>",
      "brand": "<assessment>",
      "ecosystem_lockin": "<assessment>",
      "community": "<assessment>",
      "moat_exists": "<yes/no>",
      "analysis": "<2-3 paragraph analysis>"
    },
    "failure_scenarios": {
      "title": "Top 5 Failure Scenarios",
      "score": null,
      "scenarios": [
        "<reason 1>",
        "<reason 2>",
        "<reason 3>",
        "<reason 4>",
        "<reason 5>"
      ],
      "analysis": "<2-3 paragraph analysis>"
    },
    "scorecard": {
      "title": "Opportunity Scorecard",
      "problem_strength": <0-10>,
      "market_size_score": <0-10>,
      "competition_risk": <0-10>,
      "distribution_difficulty": <0-10>,
      "build_difficulty": <0-10>,
      "monetization_potential": <0-10>,
      "defensibility": <0-10>,
      "overall_score": <0-100>,
      "verdict": "<Exceptional opportunity | Promising but needs differentiation | High risk / competitive market | Not worth building>",
      "verdict_emoji": "<🚀 | ✅ | ⚠️ | ❌>",
      "verdict_explanation": "<2-3 paragraph brutally honest assessment>"
    }
  }
}

Be BRUTALLY honest. Do NOT sugarcoat. Use real data from the market research above.`;
}

/**
 * Call LongCat API with thinking mode
 */
export async function analyzeIdea(idea, researchData, apiKey) {
    const prompt = buildPrompt(idea, researchData);

    const response = await fetch(LONGCAT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'LongCat-Flash-Thinking-2601',
            enable_thinking: true,
            thinking_budget: 16384,
            messages: [
                {
                    role: 'system',
                    content: 'You are a world-class startup analyst. You MUST respond with ONLY valid JSON matching the exact schema requested. No markdown fences, no text before or after — only the raw JSON object.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 8192,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`LongCat API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('No content in LongCat response');
    }

    // Parse JSON from response (strip markdown fences if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
        return JSON.parse(jsonStr);
    } catch (parseErr) {
        console.error('Failed to parse LongCat response:', jsonStr);
        throw new Error('Failed to parse AI response as JSON. The model may have returned malformed output.');
    }
}
