// Unified AI provider abstraction — supports Claude (Anthropic), Mistral and Qwen.
// All providers exchange chat messages; we normalize the request/response shape.

export type AIProvider = "claude" | "mistral" | "qwen";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  label: string;
  keyPlaceholder: string;
  keyPrefixHint: string;
  consoleUrl: string;
  consoleLabel: string;
  defaultModel: string;
}

export const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  claude: {
    label: "Anthropic Claude",
    keyPlaceholder: "sk-ant-...",
    keyPrefixHint: "Beginnt mit sk-ant-",
    consoleUrl: "https://console.anthropic.com/",
    consoleLabel: "console.anthropic.com",
    defaultModel: "claude-sonnet-4-5",
  },
  mistral: {
    label: "Mistral AI",
    keyPlaceholder: "Mistral API Key",
    keyPrefixHint: "API Key aus Ihrem Mistral-Konto",
    consoleUrl: "https://console.mistral.ai/",
    consoleLabel: "console.mistral.ai",
    defaultModel: "mistral-large-latest",
  },
  qwen: {
    label: "Qwen (Alibaba Cloud)",
    keyPlaceholder: "sk-...",
    keyPrefixHint: "API Key aus Ihrem Alibaba Cloud Model Studio Konto",
    consoleUrl: "https://bailian.console.alibabacloud.com/",
    consoleLabel: "bailian.console.alibabacloud.com",
    defaultModel: "qwen-plus",
  },
};

/**
 * Call the selected provider with a system prompt + chat history and return
 * the assistant's text response.
 */
export async function callAIChat(opts: {
  provider: AIProvider;
  apiKey: string;
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const { provider, apiKey, system, messages, maxTokens = 2000 } = opts;
  const model = opts.model ?? PROVIDERS[provider].defaultModel;

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API Fehler (${response.status}): ${errText}`);
    }
    const data = await response.json();
    return (data.content?.[0]?.text ?? "").trim();
  }

  if (provider === "qwen") {
    // Qwen — OpenAI-compatible chat completions via Alibaba Cloud Model Studio
    const response = await fetch(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Qwen API Fehler (${response.status}): ${errText}`);
    }
    const data = await response.json();
    return (data.choices?.[0]?.message?.content ?? "").trim();
  }

  // Mistral — OpenAI-compatible chat completions
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API Fehler (${response.status}): ${errText}`);
  }
  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
