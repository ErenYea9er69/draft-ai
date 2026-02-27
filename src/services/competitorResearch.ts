import type {
  ProjectProfile,
  TechStack,
  CompetitorResearchResult,
  CompetitorProfile,
  GapAnalysis,
  RoadmapItem,
  ResearchDepth,
} from "../types";
import { LongCatService } from "./longcat";
import { TavilyService } from "./tavily";
import { buildGapAnalysisPrompt, buildRoadmapPrompt } from "../prompts/competitor";

export interface ResearchProgress {
  status: "searching" | "analyzing" | "roadmap" | "complete" | "error";
  message: string;
  progress?: number;
}

export class CompetitorResearchService {
  constructor(
    private longcat: LongCatService,
    private tavily: TavilyService
  ) {}

  /**
   * Run a full competitor research cycle.
   */
  async runResearch(
    profile: ProjectProfile,
    techStack: TechStack | undefined,
    depth: ResearchDepth,
    healthScore: number | undefined,
    onProgress: (progress: ResearchProgress) => void
  ): Promise<CompetitorResearchResult> {
    const competitors = profile.competitors ?? [];
    if (competitors.length === 0) {
      throw new Error("No competitors listed in your project profile. Edit your profile to add competitors.");
    }

    if (!this.tavily.isReady()) {
      throw new Error("Tavily API key not set. Add it in Settings to run competitor research.");
    }

    if (!this.longcat.isReady()) {
      throw new Error("LongCat API key not set. Add it in Settings for AI-powered analysis.");
    }

    // 1. Search for each competitor
    onProgress({ status: "searching", message: `Researching ${competitors.length} competitors...`, progress: 10 });

    const allSearchResults: { competitor: string; results: any[] }[] = [];

    for (let i = 0; i < competitors.length; i++) {
      const name = competitors[i];
      onProgress({
        status: "searching",
        message: `Searching for ${name}... (${i + 1}/${competitors.length})`,
        progress: 10 + Math.round((i / competitors.length) * 30),
      });

      try {
        const results = await this.tavily.searchCompetitor(name, depth);
        allSearchResults.push({ competitor: name, results });
      } catch (err: any) {
        console.warn(`Search failed for ${name}:`, err.message);
        allSearchResults.push({ competitor: name, results: [] });
      }
    }

    // 2. Build a research summary document for AI analysis
    onProgress({ status: "analyzing", message: "AI analyzing competitor data...", progress: 45 });

    const researchDocument = this.buildResearchDocument(allSearchResults);

    // 3. Send to LongCat for gap analysis
    const gapAnalysisPrompt = buildGapAnalysisPrompt(profile, techStack);
    let gapAnalysis: GapAnalysis;

    try {
      const gapResponse = await this.longcat.lite(
        [
          { role: "system", content: gapAnalysisPrompt },
          { role: "user", content: researchDocument },
        ],
        { temperature: 0.2, maxTokens: 3000 }
      );

      gapAnalysis = this.parseGapAnalysis(gapResponse);
    } catch (err: any) {
      console.error("Gap analysis failed:", err);
      // Fallback: build minimal gap analysis from search results
      gapAnalysis = this.buildFallbackGapAnalysis(allSearchResults);
    }

    // 4. Generate roadmap
    onProgress({ status: "roadmap", message: "Generating prioritized roadmap...", progress: 75 });

    let roadmap: RoadmapItem[] = [];
    let competitiveScore = 50;

    try {
      const roadmapPrompt = buildRoadmapPrompt(
        profile,
        JSON.stringify(gapAnalysis, null, 2),
        healthScore
      );

      const roadmapResponse = await this.longcat.chat(
        [
          { role: "system", content: roadmapPrompt },
          { role: "user", content: "Generate the roadmap based on the gap analysis above." },
        ],
        { temperature: 0.3, maxTokens: 2000 }
      );

      const parsed = this.parseRoadmapResponse(roadmapResponse);
      roadmap = parsed.roadmap;
      competitiveScore = parsed.competitiveScore;
    } catch (err: any) {
      console.warn("Roadmap generation failed:", err.message);
    }

    const result: CompetitorResearchResult = {
      id: `research-${Date.now()}`,
      timestamp: new Date().toISOString(),
      depth,
      gapAnalysis,
      roadmap,
      competitiveScore,
    };

    onProgress({
      status: "complete",
      message: `Research complete! Competitive score: ${competitiveScore}/100`,
      progress: 100,
    });

    return result;
  }

  /**
   * Build a combined research document from all search results.
   */
  private buildResearchDocument(
    searchResults: { competitor: string; results: any[] }[]
  ): string {
    let doc = "# Competitor Research Data\n\n";

    for (const { competitor, results } of searchResults) {
      doc += `## ${competitor}\n\n`;
      if (results.length === 0) {
        doc += "No search results found.\n\n";
        continue;
      }

      for (const result of results.slice(0, 8)) {
        doc += `### ${result.title}\n`;
        doc += `URL: ${result.url}\n`;
        doc += `${result.content?.slice(0, 500) ?? "No content"}\n\n`;
      }
    }

    return doc;
  }

  /**
   * Parse gap analysis JSON from AI response.
   */
  private parseGapAnalysis(response: string): GapAnalysis {
    try {
      let json = response.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(json);
      return {
        competitorProfiles: (parsed.competitorProfiles ?? []).map((p: any) => ({
          name: p.name ?? "Unknown",
          strengths: p.strengths ?? [],
          weaknesses: p.weaknesses ?? [],
          features: p.features ?? [],
          pricing: p.pricing,
          userSentiment: p.userSentiment,
        })),
        missingFeatures: parsed.missingFeatures ?? [],
        opportunities: parsed.opportunities ?? [],
        threats: parsed.threats ?? [],
      };
    } catch {
      return { competitorProfiles: [], missingFeatures: [], opportunities: [], threats: [] };
    }
  }

  /**
   * Parse roadmap JSON from AI response.
   */
  private parseRoadmapResponse(response: string): { roadmap: RoadmapItem[]; competitiveScore: number } {
    try {
      let json = response.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(json);
      return {
        roadmap: (parsed.roadmap ?? []).map((item: any) => ({
          title: item.title ?? "Untitled",
          description: item.description ?? "",
          priority: item.priority ?? "medium",
          effort: item.effort ?? "medium",
          rationale: item.rationale ?? "",
        })),
        competitiveScore: parsed.competitiveScore ?? 50,
      };
    } catch {
      return { roadmap: [], competitiveScore: 50 };
    }
  }

  /**
   * Fallback gap analysis when AI fails — build from raw search data.
   */
  private buildFallbackGapAnalysis(
    searchResults: { competitor: string; results: any[] }[]
  ): GapAnalysis {
    const profiles: CompetitorProfile[] = searchResults.map(({ competitor, results }) => ({
      name: competitor,
      strengths: [],
      weaknesses: [],
      features: results.slice(0, 3).map((r) => r.title ?? "Unknown feature"),
    }));

    return {
      competitorProfiles: profiles,
      missingFeatures: [],
      opportunities: ["AI analysis unavailable — review raw search data manually"],
      threats: [],
    };
  }
}
