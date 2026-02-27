const TAVILY_API_URL = "https://api.tavily.com";
const TAVILY_TIMEOUT_MS = 15_000;

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  answer?: string;
}

export class TavilyService {
  private apiKey: string = "";

  initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  isReady(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Run a web search with Tavily.
   */
  async search(
    query: string,
    options?: {
      searchDepth?: "basic" | "advanced";
      maxResults?: number;
      includeDomains?: string[];
      excludeDomains?: string[];
    }
  ): Promise<TavilySearchResponse> {
    if (!this.apiKey) {
      throw new Error("Tavily API key not set. Please add it in Settings.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

    try {
      const response = await fetch(`${TAVILY_API_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: options?.searchDepth ?? "basic",
          max_results: options?.maxResults ?? 5,
          include_domains: options?.includeDomains ?? [],
          exclude_domains: options?.excludeDomains ?? [],
          include_answer: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily search failed (${response.status}): ${errorText}`);
      }

      return response.json() as Promise<TavilySearchResponse>;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error("Tavily search timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Search for competitor information — convenience wrapper.
   */
  async searchCompetitor(
    competitorName: string,
    depth: "surface" | "deep"
  ): Promise<TavilySearchResult[]> {
    const queries = [
      `${competitorName} features pricing plans`,
      `${competitorName} changelog new features 2024 2025`,
    ];

    if (depth === "deep") {
      queries.push(
        `${competitorName} reviews user feedback complaints`,
        `${competitorName} vs alternatives comparison`,
        `${competitorName} Product Hunt launch`
      );
    }

    const allResults: TavilySearchResult[] = [];

    for (const query of queries) {
      try {
        const response = await this.search(query, {
          searchDepth: depth === "deep" ? "advanced" : "basic",
          maxResults: depth === "deep" ? 5 : 3,
        });
        allResults.push(...response.results);
      } catch (error) {
        console.warn(`Tavily search failed for "${query}":`, error);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return allResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }
}
