/**
 * LongCat AI Service — 10X Enhanced
 * 
 * Expert-level startup analysis with:
 * - Multi-layered prompt with scoring rubrics
 * - Explicit data citation instructions
 * - Per-phase detailed evaluation criteria
 * - Retry logic with progressive fallback
 * - Response validation and repair
 */

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const MAX_RETRIES = 2;

/**
 * Build the world-class 11-phase analysis prompt
 */
function buildPrompt(idea, researchData) {
  return `# ROLE & MANDATE

You are a **senior partner at a top-tier consulting firm** (McKinsey/BCG caliber) who also sits on the **investment committee of a $500M venture fund**. You have 20+ years of experience evaluating startups across every sector.

Your mandate: **Protect investors from bad bets.** Your reputation depends on accuracy, not enthusiasm.

## CRITICAL RULES:
1. **Default to skepticism** — Assume the idea will fail unless strong evidence suggests otherwise
2. **Cite sources** — Reference specific findings from the market research data below. Say "According to [source]..." or "Research shows..."
3. **Use numbers** — Quantify everything possible (market sizes, user counts, pricing, growth rates)
4. **No hand-waving** — If you don't have data, say "Data insufficient" rather than guessing
5. **Internal consistency** — Your scores MUST match your written analysis. If your analysis is negative, the score must be low
6. **Compare to benchmarks** — Compare to known successful/failed startups where relevant

---

# THE STARTUP IDEA BEING EVALUATED:
${idea}

---

# LIVE MARKET INTELLIGENCE (searched in real-time):
${researchData}

---

# SCORING RUBRICS

Use these rubrics to ensure consistent, calibrated scoring:

**Problem Strength (0-10):**
0-2: No real problem / vitamin product / nobody pays for solutions
3-4: Minor inconvenience / some workarounds exist / low willingness to pay
5-6: Real pain point / people actively seek solutions / some pay for them
7-8: Significant problem / high frequency / clear budget allocation / strong workarounds
9-10: Critical, urgent problem / businesses lose money without solution / large budgets

**Market Size (0-10):**
0-2: < $100M TAM / hyper-niche
3-4: $100M-$500M TAM / niche but viable
5-6: $500M-$2B TAM / solid mid-market
7-8: $2B-$10B TAM / large opportunity
9-10: > $10B TAM / massive, expanding market

**Competition Risk (0-10):** (10 = LOW competition = good, 0 = saturated = bad)
0-2: Red ocean / dominated by big tech / no differentiation possible
3-4: Saturated with funded competitors / hard to differentiate
5-6: Competitive but with clear gaps / room for a niche player
7-8: Emerging market / few focused solutions / clear positioning opportunity
9-10: Blue ocean / no direct competitors / unserved market

**Distribution Difficulty (0-10):** (10 = EASY distribution, 0 = extremely hard)
0-2: No viable channel / requires enterprise sales from day 1 / zero viral potential
3-4: Limited channels / high CAC / slow cycle
5-6: Some viable channels / moderate CAC / possible organic growth
7-8: Strong channels / potential viral loops / SEO-friendly / community-driven
9-10: Built-in virality / product-led growth / massive organic potential

**Build Difficulty (0-10):** (10 = EASY to build, 0 = near impossible)
0-2: Requires breakthrough tech / massive R&D / regulatory approval
3-4: Complex infrastructure / specialized team / 12+ months to MVP
5-6: Moderate complexity / 6-12 months to MVP / standard stack
7-8: Standard tech stack / 3-6 months MVP / small team sufficient
9-10: Simple build / 1-3 months MVP / single developer possible

**Monetization Potential (0-10):**
0-2: No clear revenue model / users won't pay / ad-dependent
3-4: Low willingness to pay / commoditized pricing / thin margins
5-6: Viable pricing model / moderate willingness to pay / decent margins
7-8: Strong pricing power / proven SaaS model / good unit economics
9-10: Premium pricing accepted / high LTV / strong expansion revenue

**Defensibility (0-10):**
0-2: Zero moat / trivially copyable / no switching costs
3-4: Weak differentiation / easily replicated features
5-6: Some switching costs / moderate network effects / brand potential
7-8: Strong data moat OR network effects OR ecosystem lock-in
9-10: Multiple reinforcing moats / winner-take-most dynamics

---

# OUTPUT REQUIREMENTS

Return a SINGLE valid JSON object. No markdown fences. No text before or after. ONLY the JSON.

The overall_score MUST be calculated as: sum of all 7 scored dimensions × (100/70), rounded to nearest integer.

{
  "phases": {
    "problem_reality": {
      "title": "Phase 1 — Problem Reality Test",
      "score": 0,
      "who_experiences": "Specific persona(s) experiencing this problem — be granular, not generic",
      "frequency": "How often (daily/weekly/monthly/rarely) and in what context",
      "pain_level": "1-10 rating with specific justification referencing research",
      "current_workarounds": "List ALL existing workarounds users currently employ (including manual/hacky ones)",
      "users_pay_already": "Yes/No — cite specific evidence. What are they paying and how much?",
      "classification": "Must-have | Painkiller | Nice-to-have | Vitamin — justify with evidence",
      "willingness_to_switch": "Would users abandon current solution for this? What's the inertia?",
      "analysis": "3-4 paragraphs. Cite research findings. Compare to similar successful problem-solution fits. Be specific about WHY this problem matters (or doesn't)."
    },
    "market_size": {
      "title": "Phase 2 — Market Size Analysis (TAM/SAM/SOM)",
      "score": 0,
      "tam": "$ figure with calculation methodology and sources. Show your math.",
      "sam": "$ figure — what portion is realistically serviceable? Why?",
      "som": "$ figure — realistic capture in first 3 years with typical startup resources",
      "growth_rate": "Is this market growing or shrinking? At what CAGR? Source?",
      "opportunity_scale": "Niche | Medium | Large-scale — with justification",
      "adjacent_markets": "What adjacent markets could be entered? How big are they?",
      "analysis": "3-4 paragraphs. Reference specific market reports, analyst estimates, or comparable company valuations from the research data."
    },
    "customer_segmentation": {
      "title": "Phase 3 — Customer Segmentation",
      "score": null,
      "primary_segments": "3-5 specific segments with estimated sizes",
      "early_adopters": "Who would adopt first? Why? What makes them eager?",
      "most_likely_to_pay": "Which segment has the highest willingness to pay? How do you know?",
      "industries_affected": "Specific industries with pain intensity ranking",
      "recommended_first_target": "The ONE segment to target first — justify with TAM, urgency, and accessibility",
      "buyer_vs_user": "Is the buyer the same as the user? If not, explain the dynamic.",
      "analysis": "3-4 paragraphs with specific reasoning for segment prioritization. Reference any research data about customer preferences."
    },
    "competitive_intelligence": {
      "title": "Phase 4 — Competitive Intelligence",
      "score": 0,
      "competitors": [
        {
          "name": "Competitor name (from research)",
          "website": "URL if found",
          "funding": "Known funding if available",
          "features": "Core features they offer",
          "pricing": "Pricing model and specific prices if found",
          "strengths": "What they do well — be specific",
          "weaknesses": "Exploitable gaps — be specific",
          "positioning": "How they position themselves",
          "threat_level": "Low | Medium | High — why"
        }
      ],
      "indirect_competitors": "Tools/methods that solve this differently (spreadsheets, manual process, etc.)",
      "big_tech_risk": "Could Google/Microsoft/Amazon build this trivially? Have they shown interest?",
      "market_status": "Empty | Emerging | Competitive | Saturated | Red ocean",
      "white_space": "What gaps exist that NO competitor fills?",
      "analysis": "3-4 paragraphs. Map the competitive landscape. Identify the exact positioning opportunity. Reference specific competitors from the research data."
    },
    "switching_cost": {
      "title": "Phase 5 — Switching Cost & User Behavior Analysis",
      "score": null,
      "habit_lockin": "How deeply are users locked into current habits? Evidence?",
      "workflow_dependency": "How embedded is the current solution in their workflow?",
      "integrations": "What integrations tie users to current tools? Can they be replicated?",
      "data_migration": "How painful is moving data? Is there data lock-in?",
      "brand_loyalty": "How strong is brand loyalty to incumbents? Evidence?",
      "learning_curve": "How much retraining is needed to switch? Time cost?",
      "realistic_adoption": "Honest assessment: would users ACTUALLY switch? Under what conditions?",
      "analysis": "3-4 paragraphs. Be honest about behavioral inertia. Reference research about user satisfaction/dissatisfaction with current solutions."
    },
    "distribution": {
      "title": "Phase 6 — Distribution & Go-To-Market Strategy",
      "score": 0,
      "channels": "Ranked list of viable channels with estimated effectiveness",
      "viral_loops": "Is there a natural viral loop? Describe it specifically or explain why not",
      "seo_potential": "What keywords would users search? Monthly volume estimates if possible",
      "community_growth": "Are there existing communities this could tap into? Specifics?",
      "content_marketing": "What content angles could drive organic traffic?",
      "partnerships": "Potential partnership channels?",
      "paid_acquisition": "Estimated CAC via paid channels? Is it unit-economics friendly?",
      "best_strategy": "The #1 recommended GTM strategy for the first 6 months with specific tactics",
      "analysis": "3-4 paragraphs. Be realistic about acquisition costs and timelines. Reference any growth patterns observed in research."
    },
    "build_feasibility": {
      "title": "Phase 7 — Build Feasibility (Software)",
      "score": 0,
      "product_type": "SaaS | Web App | Mobile | API | AI Tool | Automation | Marketplace",
      "engineering_complexity": "Low | Medium | High | Very High — with specific technical reasoning",
      "mvp_timeline": "Realistic MVP timeline with team size assumptions",
      "infrastructure": "Key infrastructure requirements (cloud, AI/ML, real-time, etc.)",
      "integrations_needed": "Critical third-party integrations required",
      "technical_risks": "Specific technical risks or unsolved problems",
      "scaling_challenges": "What breaks at 10x, 100x, 1000x scale?",
      "analysis": "3-4 paragraphs. Reference any technical insights from the research (tech stacks of competitors, open-source tools available, etc.)"
    },
    "economic_model": {
      "title": "Phase 8 — Economic Model & Unit Economics",
      "score": null,
      "pricing_models": "Ranked list of viable pricing models with reasoning",
      "recommended_pricing": "Specific recommended pricing with tier structure",
      "avg_customer_value": "Estimated ACV/ARPU with reasoning from comparable companies",
      "ltv_estimate": "Estimated LTV with retention assumptions",
      "cac_estimate": "Estimated CAC range based on distribution analysis",
      "ltv_cac_ratio": "Projected LTV:CAC ratio — is it venture-viable (>3:1)?",
      "retention_potential": "Low | Medium | High — with specific reasoning",
      "margins": "Gross margin estimate with cost drivers",
      "revenue_scalability": "How does revenue scale? Linear or exponential?",
      "business_type": "Lifestyle SaaS | Profitable Niche | Venture-scale — with justification",
      "analysis": "3-4 paragraphs. Reference competitor pricing from research. Project realistic revenue scenarios for Years 1-3."
    },
    "moat": {
      "title": "Phase 9 — Moat & Defensibility Analysis",
      "score": 0,
      "network_effects": "Present/Absent — Type (direct/indirect/data) — Strength",
      "data_advantage": "Can unique proprietary data be accumulated? How?",
      "switching_costs_moat": "Would switching costs increase over time? How?",
      "brand": "Can a meaningful brand be built? How long would it take?",
      "ecosystem_lockin": "Can an ecosystem or platform dynamic emerge?",
      "community": "Can a community become a competitive advantage?",
      "technical_moat": "Any proprietary technology, algorithms, or IP?",
      "moat_exists": "Yes/No — honest assessment",
      "moat_timeline": "If a moat can be built, how many years until it becomes meaningful?",
      "analysis": "3-4 paragraphs. Compare to moats of successful companies in adjacent spaces. Be brutally honest about whether this is copyable."
    },
    "failure_scenarios": {
      "title": "Phase 10 — Top 5 Failure Scenarios",
      "score": null,
      "scenarios": [
        {"risk": "Failure scenario 1", "probability": "High/Medium/Low", "mitigation": "How to reduce this risk"},
        {"risk": "Failure scenario 2", "probability": "High/Medium/Low", "mitigation": "How to reduce this risk"},
        {"risk": "Failure scenario 3", "probability": "High/Medium/Low", "mitigation": "How to reduce this risk"},
        {"risk": "Failure scenario 4", "probability": "High/Medium/Low", "mitigation": "How to reduce this risk"},
        {"risk": "Failure scenario 5", "probability": "High/Medium/Low", "mitigation": "How to reduce this risk"}
      ],
      "biggest_killer": "The single most likely reason this startup dies — and what must be true to survive",
      "analysis": "3-4 paragraphs. Reference specific failures from research. Be brutally realistic."
    },
    "scorecard": {
      "title": "Phase 11 — Final Opportunity Scorecard",
      "problem_strength": 0,
      "market_size_score": 0,
      "competition_risk": 0,
      "distribution_difficulty": 0,
      "build_difficulty": 0,
      "monetization_potential": 0,
      "defensibility": 0,
      "overall_score": 0,
      "verdict": "Exceptional opportunity | Promising but needs differentiation | High risk / competitive market | Not worth building",
      "verdict_emoji": "🚀 | ✅ | ⚠️ | ❌",
      "verdict_explanation": "4-5 paragraphs. Summarize the MOST CRITICAL findings across all phases. What would need to be true for this to succeed? What's the most likely outcome? Would you personally invest $500K at a $5M valuation? Why or why not? Give specific, actionable advice on what to do next.",
      "go_nogo_recommendation": "Specific recommendation: (1) GO — build it now, (2) CONDITIONAL GO — build if X, (3) PIVOT — change approach to Y, (4) NO GO — don't build this",
      "next_steps": "If proceeding, what are the 3 most important things to validate in the next 30 days?"
    }
  }
}

MANDATORY REMINDERS:
- overall_score = (problem_strength + market_size_score + competition_risk + distribution_difficulty + build_difficulty + monetization_potential + defensibility) × (100/70), rounded
- Scores MUST match analysis tone — if analysis is negative, score MUST be below 5
- Cite at least 3 specific findings from the research data
- Each competitor entry should reference actual companies found in the research
- If research data is thin on a topic, explicitly say so
- Do NOT return scores of exactly 5 as a cop-out — commit to a direction`;
}

/**
 * Build the system prompt for the AI
 */
function buildSystemPrompt() {
  return `You are a senior venture capital partner and strategy consultant with 20 years of experience.

RESPONSE FORMAT:
- You MUST return ONLY a valid JSON object matching the exact schema in the user message
- No markdown fences (\`\`\`), no explanatory text, no apologies — ONLY the raw JSON
- All string values must be properly escaped for JSON (no unescaped quotes, newlines, etc.)
- Use \\n for newlines within string values if needed
- Ensure all arrays and objects are properly closed

ANALYSIS QUALITY:
- Be data-driven: cite specific findings from the provided research
- Be quantitative: use numbers, percentages, dollar amounts wherever possible
- Be comparative: reference known startups, market benchmarks, industry standards
- Be honest: your credibility depends on accuracy, not optimism
- Be action-oriented: every insight should help the founder make a decision`;
}

/**
 * Call LongCat API with thinking mode and retry logic
 */
export async function analyzeIdea(idea, researchData, apiKey) {
  const prompt = buildPrompt(idea, researchData);
  const systemPrompt = buildSystemPrompt();

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(LONGCAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'LongCat-Flash-Thinking-2601',
          enable_thinking: true,
          thinking_budget: 32768,  // doubled for deeper reasoning
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,  // lower temperature for more consistent, factual output
          max_tokens: 16384, // doubled to allow for richer analysis
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw new Error(`LongCat API error: ${response.status} — ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LongCat response');
      }

      // Parse and validate the response
      const parsed = parseAndValidateResponse(content);
      return parsed;

    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`Attempt ${attempt + 1} failed, retrying...`, err.message);
        await sleep(2000 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError || new Error('Analysis failed after all retries');
}

/**
 * Parse, clean, and validate the AI response
 * Handles common issues like markdown fences, trailing text, malformed JSON
 */
function parseAndValidateResponse(raw) {
  let jsonStr = raw.trim();

  // Strip markdown fences (```json ... ``` or ``` ... ```)
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }

  // Sometimes the model prefixes with "Here is..." or similar
  const jsonStart = jsonStr.indexOf('{');
  if (jsonStart > 0 && jsonStart < 100) {
    jsonStr = jsonStr.substring(jsonStart);
  }

  // Sometimes there's trailing text after the closing brace
  const lastBrace = jsonStr.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < jsonStr.length - 1) {
    jsonStr = jsonStr.substring(0, lastBrace + 1);
  }

  // Attempt parse
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // Try to fix common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')     // trailing commas in objects
      .replace(/,\s*\]/g, ']')     // trailing commas in arrays
      .replace(/'/g, '"')          // single quotes to double
      .replace(/\n/g, '\\n')       // unescaped newlines in strings
      .replace(/\t/g, '\\t');      // unescaped tabs

    try {
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      console.error('JSON parse failed after repair attempt:', jsonStr.substring(0, 500));
      throw new Error('Failed to parse AI response. The model returned malformed JSON. Please try again.');
    }
  }

  // Validate structure
  if (!parsed.phases) {
    throw new Error('AI response missing "phases" key. Malformed output.');
  }

  // Ensure scorecard overall_score is consistent
  const sc = parsed.phases.scorecard;
  if (sc) {
    const dims = [
      sc.problem_strength, sc.market_size_score, sc.competition_risk,
      sc.distribution_difficulty, sc.build_difficulty, sc.monetization_potential,
      sc.defensibility
    ].map(v => Number(v) || 0);

    const calculatedScore = Math.round((dims.reduce((a, b) => a + b, 0) / 70) * 100);

    // If the model's score is wildly off from calculated, use the calculated one
    if (Math.abs((sc.overall_score || 0) - calculatedScore) > 10) {
      sc.overall_score = calculatedScore;
    }
  }

  return parsed;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
