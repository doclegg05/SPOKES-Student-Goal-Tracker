class OllamaClient {
  constructor({
    baseUrl = "http://127.0.0.1:11434",
    model = "glm-4.7-flash",
    timeoutMs = 12_000,
    maxConcurrent = 3
  } = {}) {
    this.baseUrl = String(baseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    this.model = String(model || "glm-4.7-flash").trim() || "glm-4.7-flash";
    this.timeoutMs = Math.max(1000, Number(timeoutMs) || 12_000);
    this.maxConcurrent = Math.max(1, Number(maxConcurrent) || 3);
    this.active = 0;
    this.waitQueue = [];
  }

  async run(task) {
    if (this.active >= this.maxConcurrent) {
      await new Promise((resolve) => this.waitQueue.push(resolve));
    }

    this.active += 1;
    try {
      return await task();
    } finally {
      this.active = Math.max(0, this.active - 1);
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }

  async chatJson({ messages = [], model = this.model } = {}) {
    return this.run(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, this.timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            model,
            stream: false,
            format: "json",
            messages
          }),
          signal: controller.signal
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = typeof payload?.error === "string"
            ? payload.error
            : `Ollama request failed (${response.status})`;
          const error = new Error(detail);
          error.code = "ollama_http_error";
          throw error;
        }

        const content = typeof payload?.message?.content === "string"
          ? payload.message.content
          : "";
        if (!content) {
          const error = new Error("Ollama response did not include message.content.");
          error.code = "ollama_empty_content";
          throw error;
        }

        return {
          content,
          raw: payload,
          latencyMs: Date.now() - startedAt
        };
      } catch (error) {
        if (error?.name === "AbortError") {
          const timeoutError = new Error("Ollama request timed out.");
          timeoutError.code = "ollama_timeout";
          throw timeoutError;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
  }
}

module.exports = {
  OllamaClient
};
