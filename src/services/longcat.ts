import OpenAI from "openai";

const LONGCAT_BASE_URL = "https://api.longcat.chat/openai";
const MODEL_CHAT = "LongCat-Flash-Chat";
const MODEL_LITE = "LongCat-Flash-Lite";
const TIMEOUT_CHAT_MS = 30_000;
const TIMEOUT_ANALYZE_MS = 90_000;

export class LongCatService {
  private client: OpenAI | null = null;
  private tokenUsage = { input: 0, output: 0, lastReset: new Date().toDateString() };

  initialize(apiKey: string): void {
    this.client = new OpenAI({
      apiKey,
      baseURL: LONGCAT_BASE_URL,
    });
  }

  isReady(): boolean {
    return this.client !== null;
  }

  private resetDailyUsageIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.tokenUsage.lastReset !== today) {
      this.tokenUsage = { input: 0, output: 0, lastReset: today };
    }
  }

  getTokenUsage(): { input: number; output: number } {
    this.resetDailyUsageIfNeeded();
    return { input: this.tokenUsage.input, output: this.tokenUsage.output };
  }

  /**
   * Send a chat completion request using Flash-Chat (main model).
   * Use for user-facing analysis and chat — 500K tokens/day free.
   */
  async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.client) {
      throw new Error("LongCat API not initialized. Please set your API key in Settings.");
    }

    this.resetDailyUsageIfNeeded();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_CHAT_MS);

    try {
      const response = await this.client.chat.completions.create({
        model: MODEL_CHAT,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 2000,
      }, { signal: controller.signal as any });

      // Track token usage
      if (response.usage) {
        this.tokenUsage.input += response.usage.prompt_tokens;
        this.tokenUsage.output += response.usage.completion_tokens;
      }

      return response.choices[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Send a request using Flash-Lite (lightweight model).
   * Use for internal/bulk tasks — 50M tokens/day free.
   */
  async lite(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.client) {
      throw new Error("LongCat API not initialized. Please set your API key in Settings.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_CHAT_MS);

    try {
      const response = await this.client.chat.completions.create({
        model: MODEL_LITE,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 1000,
      }, { signal: controller.signal as any });

      return response.choices[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Analyze code with a structured prompt — expects JSON back.
   * Uses Flash-Chat (500K tokens/day free).
   */
  async analyze(systemPrompt: string, code: string): Promise<string> {
    return this.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: code },
    ], { temperature: 0.1, maxTokens: 4000 });
  }

  /**
   * Analyze code using Flash-Lite — for bulk/internal analysis.
   * Uses Flash-Lite (50M tokens/day free — effectively unlimited).
   */
  async analyzeLite(systemPrompt: string, code: string): Promise<string> {
    return this.lite([
      { role: "system", content: systemPrompt },
      { role: "user", content: code },
    ], { temperature: 0.1, maxTokens: 4000 });
  }

  /**
   * Stream a chat response (for the chat interface).
   */
  async *chatStream(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error("LongCat API not initialized. Please set your API key in Settings.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_ANALYZE_MS);

    try {
      const stream = await this.client.chat.completions.create({
        model: MODEL_CHAT,
        messages,
        temperature: 0.5,
        max_tokens: 3000,
        stream: true,
      }, { signal: controller.signal as any });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (err: any) {
      // Re-throw abort as a user-friendly timeout message
      if (err?.name === "AbortError" || controller.signal.aborted) {
        throw new Error("Request timed out. The AI took too long to respond.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
