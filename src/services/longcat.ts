import OpenAI from "openai";

const LONGCAT_BASE_URL = "https://api.longcat.chat/openai";
const MODEL_CHAT = "LongCat-Flash-Chat";
const MODEL_LITE = "LongCat-Flash-Lite";

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

    const response = await this.client.chat.completions.create({
      model: MODEL_CHAT,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2000,
    });

    // Track token usage
    if (response.usage) {
      this.tokenUsage.input += response.usage.prompt_tokens;
      this.tokenUsage.output += response.usage.completion_tokens;
    }

    return response.choices[0]?.message?.content ?? "";
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

    const response = await this.client.chat.completions.create({
      model: MODEL_LITE,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 1000,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  /**
   * Analyze code with a structured prompt — expects JSON back.
   */
  async analyze(systemPrompt: string, code: string): Promise<string> {
    return this.chat([
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

    const stream = await this.client.chat.completions.create({
      model: MODEL_CHAT,
      messages,
      temperature: 0.5,
      max_tokens: 3000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
