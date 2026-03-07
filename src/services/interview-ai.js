/**
 * Interview AI Helper Service
 * Lightweight AI calls for the guided interview:
 * - Answer quality feedback + suggestions
 * - AI-generated follow-up questions based on context
 * - Brainstorm helper ("Help me think")
 * - Idea readiness scoring
 *
 * Uses the LongCat API with small token budgets to be fast and quota-friendly.
 */

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';

/**
 * Quick LongCat call with small budget for fast responses
 */
async function quickAICall(apiKey, systemPrompt, userPrompt, maxTokens = 1024) {
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
                thinking_budget: 2048,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.6,
                max_tokens: maxTokens,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
        console.error('Interview AI call failed:', err);
        return null;
    }
}

/**
 * Get AI feedback on an answer: quality score, what's good, what's missing
 */
export async function getAnswerFeedback(apiKey, stepTitle, question, answer, previousContext) {
    if (!apiKey || !answer?.trim()) return null;

    const system = `You are a startup advisor reviewing a founder's description of their idea.
Give brief, actionable feedback. Response MUST be valid JSON only — no markdown fences.`;

    const prompt = `The founder is answering: "${question}"
Their context so far: ${previousContext || 'None yet'}

Their answer: "${answer}"

Rate this answer and give feedback. Return ONLY this JSON:
{
  "quality": <1-5 where 1=vague/useless, 3=okay, 5=excellent>,
  "good": "<1 sentence about what's good in this answer>",
  "missing": "<1-2 specific things they should add for a better analysis>",
  "suggestion": "<A brief example of how to improve this answer>"
}`;

    const result = await quickAICall(apiKey, system, prompt, 512);
    if (!result) return null;

    try {
        let json = result.trim();
        if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * Generate AI follow-up questions based on the current answer
 */
export async function getFollowUpQuestions(apiKey, stepTitle, answer, previousContext) {
    if (!apiKey || !answer?.trim()) return null;

    const system = `You are a startup mentor. Generate 3 probing follow-up questions to help a founder think deeper about their idea. Response MUST be valid JSON only.`;

    const prompt = `The founder just answered about "${stepTitle}":
"${answer}"

Context from previous answers: ${previousContext || 'None yet'}

Generate 3 SHORT follow-up questions that would help them think deeper. Each should uncover blind spots or add useful detail for startup validation.

Return ONLY this JSON:
{
  "questions": [
    "<question 1 — max 15 words>",
    "<question 2 — max 15 words>",
    "<question 3 — max 15 words>"
  ]
}`;

    const result = await quickAICall(apiKey, system, prompt, 256);
    if (!result) return null;

    try {
        let json = result.trim();
        if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * "Help me think" brainstorm helper — generates ideas for a specific question
 */
export async function brainstormHelper(apiKey, stepTitle, question, hint, previousContext) {
    if (!apiKey) return null;

    const system = `You are a creative startup brainstorming partner. Help a founder think through an aspect of their idea. Be specific and practical. Response MUST be valid JSON only.`;

    const prompt = `The founder needs help thinking about: "${stepTitle}"
Question: "${question}"
Hint: "${hint}"

Context from their previous answers: ${previousContext || 'No context yet — this is the first question'}

Generate helpful brainstorming prompts and example ideas to get them started.

Return ONLY this JSON:
{
  "think_about": [
    "<prompt 1 — a specific angle to consider>",
    "<prompt 2 — another angle>",
    "<prompt 3 — another angle>"
  ],
  "example_answer": "<A realistic 2-3 sentence example answer they could adapt>"
}`;

    const result = await quickAICall(apiKey, system, prompt, 512);
    if (!result) return null;

    try {
        let json = result.trim();
        if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * Calculate idea readiness score based on all current answers
 */
export async function getReadinessScore(apiKey, answers) {
    if (!apiKey) return null;

    const filledAnswers = Object.entries(answers)
        .filter(([_, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v.substring(0, 200)}`);

    if (filledAnswers.length < 2) return null;

    const system = `You are a startup analyst. Evaluate how ready an idea description is for a full validation analysis. Response MUST be valid JSON only.`;

    const prompt = `Here's what a founder has described so far:
${filledAnswers.join('\n')}

Rate how ready this idea is for a thorough startup validation analysis.

Return ONLY this JSON:
{
  "readiness": <0-100>,
  "strengths": "<What's well-described — 1 sentence>",
  "gaps": "<What's missing or too vague — 1 sentence>",
  "ready_enough": <true if readiness >= 60, false otherwise>
}`;

    const result = await quickAICall(apiKey, system, prompt, 256);
    if (!result) return null;

    try {
        let json = result.trim();
        if (json.startsWith('```')) json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
        return JSON.parse(json);
    } catch {
        return null;
    }
}
