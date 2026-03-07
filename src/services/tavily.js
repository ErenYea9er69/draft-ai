/**
 * Tavily API Service
 * Live web search for competitor and market research
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Search for competitors, market data, and existing solutions
 * @param {string} idea - The startup idea
 * @param {string} apiKey - Tavily API key
 * @returns {Promise<object>} search results
 */
export async function searchCompetitors(idea, apiKey) {
    const queries = [
        `${idea} startup competitors market`,
        `${idea} SaaS tools solutions existing`,
    ];

    const allResults = [];

    for (const query of queries) {
        try {
            const response = await fetch(TAVILY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    query,
                    search_depth: 'basic',
                    max_results: 5,
                    include_answer: 'basic',
                    topic: 'general',
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Tavily API error: ${response.status} — ${err}`);
            }

            const data = await response.json();
            allResults.push({
                query,
                answer: data.answer || '',
                results: (data.results || []).map(r => ({
                    title: r.title,
                    url: r.url,
                    content: r.content,
                    score: r.score,
                })),
            });
        } catch (err) {
            console.error(`Tavily search failed for "${query}":`, err);
            allResults.push({ query, answer: '', results: [], error: err.message });
        }
    }

    return allResults;
}

/**
 * Format Tavily results into a string for the AI prompt
 */
export function formatResearchForPrompt(tavilyResults) {
    if (!tavilyResults || tavilyResults.length === 0) return 'No market research data available.';

    let text = '### Live Market Research Data\n\n';

    for (const searchResult of tavilyResults) {
        text += `**Search: "${searchResult.query}"**\n`;
        if (searchResult.answer) {
            text += `Summary: ${searchResult.answer}\n\n`;
        }
        if (searchResult.results.length > 0) {
            text += `Sources:\n`;
            for (const r of searchResult.results) {
                text += `- [${r.title}](${r.url}): ${r.content?.substring(0, 200) || 'No content'}...\n`;
            }
            text += '\n';
        }
    }

    return text;
}
