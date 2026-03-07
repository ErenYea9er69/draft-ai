/**
 * Tavily API Service — 10X Enhanced
 * 
 * Multi-strategy search engine that runs 7 targeted research queries
 * to build a comprehensive market intelligence report before AI analysis.
 * 
 * Strategies:
 * 1. Direct competitor search
 * 2. Market size & industry reports
 * 3. User pain points & complaints
 * 4. Pricing & business model intelligence
 * 5. Recent funding & startup news
 * 6. Open source & free alternatives
 * 7. Failed startups in the space
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * Extract core keywords from a startup idea for targeted searches
 */
function extractKeywords(idea) {
    // Remove common stop words and get meaningful terms
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'out', 'off', 'over', 'under', 'again',
        'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so',
        'yet', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
        'just', 'because', 'if', 'that', 'this', 'these', 'those',
        'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
        'all', 'any', 'every', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
        'it', 'its', 'they', 'their', 'them', 'he', 'she', 'him', 'her',
        'startup', 'idea', 'build', 'create', 'make', 'want', 'like',
        'think', 'know', 'get', 'go', 'would', 'about', 'also', 'use',
        'using', 'based', 'help', 'new', 'way', 'app', 'tool', 'platform',
    ]);

    const words = idea
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    // Get unique keywords, prioritize longer/more specific terms
    const unique = [...new Set(words)].sort((a, b) => b.length - a.length);
    return unique.slice(0, 8);
}

/**
 * Build the 7 targeted search queries from the idea
 */
function buildSearchStrategies(idea) {
    const keywords = extractKeywords(idea);
    const topKeywords = keywords.slice(0, 4).join(' ');
    const domainKeywords = keywords.slice(0, 3).join(' ');

    return [
        {
            id: 'competitors',
            label: '🔍 Direct Competitors',
            query: `${topKeywords} competitors startups companies market leaders`,
            depth: 'advanced',
            maxResults: 7,
            topic: 'general',
        },
        {
            id: 'market_size',
            label: '📈 Market Size & Reports',
            query: `${domainKeywords} market size TAM industry report 2024 2025 growth`,
            depth: 'basic',
            maxResults: 5,
            topic: 'general',
        },
        {
            id: 'pain_points',
            label: '😤 User Pain Points',
            query: `${topKeywords} problems complaints frustrations users reviews`,
            depth: 'basic',
            maxResults: 5,
            topic: 'general',
        },
        {
            id: 'pricing',
            label: '💰 Pricing Intelligence',
            query: `${domainKeywords} SaaS pricing plans cost comparison alternative`,
            depth: 'basic',
            maxResults: 5,
            topic: 'general',
        },
        {
            id: 'funding',
            label: '💸 Funding & News',
            query: `${domainKeywords} startup funding raised series venture capital news`,
            depth: 'basic',
            maxResults: 5,
            topic: 'news',
        },
        {
            id: 'alternatives',
            label: '🆓 Open Source & Free Tools',
            query: `${topKeywords} open source free alternative tool github`,
            depth: 'basic',
            maxResults: 5,
            topic: 'general',
        },
        {
            id: 'failures',
            label: '💀 Failed Startups',
            query: `${domainKeywords} startup failed shutdown post-mortem lessons learned`,
            depth: 'basic',
            maxResults: 4,
            topic: 'general',
        },
    ];
}

/**
 * Execute a single Tavily search with retry logic
 */
async function executeSingleSearch(strategy, apiKey, retryCount = 0) {
    try {
        const response = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query: strategy.query,
                search_depth: strategy.depth,
                max_results: strategy.maxResults,
                include_answer: 'advanced',  // get detailed LLM-generated answer
                topic: strategy.topic,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            // Rate limit — retry after delay
            if (response.status === 429 && retryCount < MAX_RETRIES) {
                await sleep(RETRY_DELAY * (retryCount + 1));
                return executeSingleSearch(strategy, apiKey, retryCount + 1);
            }
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return {
            id: strategy.id,
            label: strategy.label,
            query: strategy.query,
            answer: data.answer || '',
            results: (data.results || []).map(r => ({
                title: r.title || '',
                url: r.url || '',
                content: r.content || '',
                score: r.score || 0,
            })),
            creditUsed: data.usage?.credits || 1,
        };
    } catch (err) {
        // Retry on network errors
        if (retryCount < MAX_RETRIES) {
            await sleep(RETRY_DELAY * (retryCount + 1));
            return executeSingleSearch(strategy, apiKey, retryCount + 1);
        }
        console.error(`Search failed for "${strategy.id}":`, err);
        return {
            id: strategy.id,
            label: strategy.label,
            query: strategy.query,
            answer: '',
            results: [],
            error: err.message,
        };
    }
}

/**
 * Main search function: runs all 7 strategies in parallel batches
 * @param {string} idea - The startup idea
 * @param {string} apiKey - Tavily API key
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<object[]>} All search results
 */
export async function searchCompetitors(idea, apiKey, onProgress) {
    const strategies = buildSearchStrategies(idea);

    if (onProgress) onProgress({ total: strategies.length, done: 0, current: strategies[0].label });

    // Run in two batches to avoid rate limits (4 + 3)
    const batch1 = strategies.slice(0, 4);
    const batch2 = strategies.slice(4);

    const results1 = await Promise.all(
        batch1.map(s => executeSingleSearch(s, apiKey))
    );

    if (onProgress) onProgress({ total: strategies.length, done: 4, current: batch2[0]?.label || 'Finalizing' });

    // Small delay between batches to be kind to rate limits
    await sleep(300);

    const results2 = await Promise.all(
        batch2.map(s => executeSingleSearch(s, apiKey))
    );

    const allResults = [...results1, ...results2];

    if (onProgress) onProgress({ total: strategies.length, done: strategies.length, current: 'Complete' });

    // Calculate stats
    const totalSources = allResults.reduce((sum, r) => sum + r.results.length, 0);
    const totalCredits = allResults.reduce((sum, r) => sum + (r.creditUsed || 1), 0);
    const failedSearches = allResults.filter(r => r.error).length;

    return {
        searches: allResults,
        stats: {
            totalSearches: strategies.length,
            totalSources,
            totalCredits,
            failedSearches,
            keywords: extractKeywords(idea),
        },
    };
}

/**
 * Format ALL Tavily results into a rich, structured intelligence brief for the AI
 * This is the critical bridge between raw search data and AI analysis quality
 */
export function formatResearchForPrompt(tavilyData) {
    if (!tavilyData?.searches || tavilyData.searches.length === 0) {
        return 'No market research data available. Rely on your training knowledge.';
    }

    const { searches, stats } = tavilyData;
    let brief = `# LIVE MARKET INTELLIGENCE BRIEF
> Searched ${stats.totalSearches} research dimensions | Found ${stats.totalSources} sources
> Keywords extracted: ${stats.keywords.join(', ')}

`;

    for (const search of searches) {
        if (search.error && search.results.length === 0) continue;

        brief += `---\n## ${search.label}\n`;

        // Include the AI-generated summary answer (most valuable part)
        if (search.answer) {
            brief += `### Key Findings:\n${search.answer}\n\n`;
        }

        // Include source details
        if (search.results.length > 0) {
            brief += `### Sources (${search.results.length}):\n`;
            for (const r of search.results) {
                const content = r.content?.substring(0, 350) || '';
                brief += `- **${r.title}** (${r.url})\n  ${content}\n\n`;
            }
        }

        brief += '\n';
    }

    // Add meta-instructions for the AI
    brief += `---
## RESEARCH QUALITY NOTES
- This research was conducted in real-time via web search
- Sources are ranked by relevance score
- The AI summaries per section synthesize multiple sources
- IMPORTANT: Cross-reference findings across sections for accuracy
- If sources conflict, note the discrepancy in your analysis
- Where data is missing, clearly state it rather than guessing
`;

    return brief;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
