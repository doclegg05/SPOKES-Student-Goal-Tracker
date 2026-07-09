const { OllamaClient } = require("./ollama-client");
const {
  classifyChatInput,
  buildSystemPrompt,
  buildEvaluateSystemPrompt,
  buildRedirectReply,
  normalizePromptKey,
  clampText
} = require("./policy");
const { heuristicChat, heuristicEvaluate, qualityFromRubric } = require("./heuristics");
const { safeParseJson, normalizeChatResult, normalizeEvaluateResult } = require("./schema");

const MAX_RECENT_PER_PROMPT = 20;

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeGoals(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    bhag: clampText(src.bhag, 500),
    monthly: clampText(src.monthly, 500),
    weekly: clampText(src.weekly, 500),
    daily: clampText(src.daily, 500),
    tasks: clampText(src.tasks, 500)
  };
}

function sanitizeSmartDraft(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    goal: clampText(src.goal, 500),
    why: clampText(src.why, 500),
    proof: clampText(src.proof, 500)
  };
}

function defaultTeacherSnapshot() {
  return {
    riskLevel: "low",
    focusArea: "Maintain progress",
    nextInstructorMove: "Acknowledge progress and ask for the next measurable checkpoint."
  };
}

function normalizeCoachRecord(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const record = {
    updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : null,
    latestByPrompt: {},
    recentByPrompt: {},
    counters: {
      requests: Math.max(0, toNumber(src?.counters?.requests, 0)),
      offTopicRedirects: Math.max(0, toNumber(src?.counters?.offTopicRedirects, 0)),
      fallbacks: Math.max(0, toNumber(src?.counters?.fallbacks, 0))
    },
    teacherSnapshot: defaultTeacherSnapshot()
  };

  if (src.latestByPrompt && typeof src.latestByPrompt === "object") {
    for (const [key, value] of Object.entries(src.latestByPrompt)) {
      const promptKey = normalizePromptKey(key);
      const item = value && typeof value === "object" ? value : {};
      record.latestByPrompt[promptKey] = {
        quality: String(item.quality || "medium"),
        alignment: String(item.alignment || "partial"),
        needsRevision: Boolean(item.needsRevision),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
        focusArea: typeof item.focusArea === "string" ? item.focusArea : ""
      };
    }
  }

  if (src.recentByPrompt && typeof src.recentByPrompt === "object") {
    for (const [key, value] of Object.entries(src.recentByPrompt)) {
      const promptKey = normalizePromptKey(key);
      const rows = Array.isArray(value) ? value : [];
      record.recentByPrompt[promptKey] = rows
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          at: typeof row.at === "string" ? row.at : nowIso(),
          kind: typeof row.kind === "string" ? row.kind : "chat",
          quality: typeof row.quality === "string" ? row.quality : "medium",
          alignment: typeof row.alignment === "string" ? row.alignment : "partial",
          needsRevision: Boolean(row.needsRevision),
          offTopic: Boolean(row.offTopic),
          fallbackUsed: Boolean(row.fallbackUsed)
        }))
        .slice(-MAX_RECENT_PER_PROMPT);
    }
  }

  if (src.teacherSnapshot && typeof src.teacherSnapshot === "object") {
    const base = defaultTeacherSnapshot();
    record.teacherSnapshot = {
      riskLevel: String(src.teacherSnapshot.riskLevel || base.riskLevel),
      focusArea: String(src.teacherSnapshot.focusArea || base.focusArea),
      nextInstructorMove: String(src.teacherSnapshot.nextInstructorMove || base.nextInstructorMove)
    };
  }

  return record;
}

function signalValue(signal) {
  const value = String(signal || "").toLowerCase();
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function qualityFromSignals(signals) {
  const s = signals && typeof signals === "object" ? signals : {};
  const score = (signalValue(s.specificity) + signalValue(s.measurable) + signalValue(s.timeBound)) / 3;
  if (score >= 2.6) return "high";
  if (score >= 1.8) return "medium";
  return "low";
}

function focusAreaFromChatSignals(signals) {
  const s = signals && typeof signals === "object" ? signals : {};
  if (String(s.timeBound || "").toLowerCase() === "low") return "Time-bound specificity";
  if (String(s.measurable || "").toLowerCase() === "low") return "Measurable milestones";
  if (String(s.specificity || "").toLowerCase() === "low") return "Specific actions";
  return "Goal refinement";
}

function focusAreaFromRubric(rubric) {
  if (rubric?.timeBound !== "yes") return "Time-bound specificity";
  if (rubric?.measurable !== "yes") return "Measurable milestones";
  if (rubric?.specific !== "yes") return "Specific actions";
  if (rubric?.relevant !== "yes") return "Goal alignment";
  return "Maintain progress";
}

function deriveTeacherSnapshot(latestByPrompt) {
  const items = Object.values(latestByPrompt || {});
  if (!items.length) {
    return defaultTeacherSnapshot();
  }

  const highRisk = items.some((item) => item.alignment === "misaligned" || item.quality === "low");
  const mediumRisk = items.some((item) => item.needsRevision || item.alignment === "partial");
  const riskLevel = highRisk ? "high" : mediumRisk ? "medium" : "low";

  let focusArea = "Maintain progress";
  const firstNeed = items.find((item) => item.needsRevision) || items[0];
  if (firstNeed && firstNeed.focusArea) {
    focusArea = firstNeed.focusArea;
  } else if (firstNeed?.alignment === "misaligned") {
    focusArea = "Goal alignment";
  }

  const nextInstructorMove = (() => {
    if (riskLevel === "high") {
      return "Ask the student to reconnect this goal to their BHAG and set one measurable deadline.";
    }
    if (riskLevel === "medium") {
      return "Prompt for one clearer metric and one concrete time commitment.";
    }
    return "Reinforce progress and ask for the next checkpoint.";
  })();

  return {
    riskLevel,
    focusArea,
    nextInstructorMove
  };
}

function pushRecentSignal(record, promptKey, signalRow) {
  if (!record.recentByPrompt[promptKey]) {
    record.recentByPrompt[promptKey] = [];
  }
  record.recentByPrompt[promptKey].push(signalRow);
  record.recentByPrompt[promptKey] = record.recentByPrompt[promptKey].slice(-MAX_RECENT_PER_PROMPT);
}

class CoachService {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.provider = "ollama";
    this.model = String(config.model || "glm-4.7-flash").trim() || "glm-4.7-flash";
    this.maxInputChars = Math.max(200, toNumber(config.maxInputChars, 1200));
    this.maxHistoryTurns = Math.max(1, toNumber(config.maxHistoryTurns, 6));
    this.ratePerMinute = Math.max(1, toNumber(config.ratePerMinute, 12));
    this.rateWindows = new Map();
    this.client = new OllamaClient({
      baseUrl: config.ollamaUrl,
      model: this.model,
      timeoutMs: config.timeoutMs,
      maxConcurrent: config.maxConcurrent
    });
  }

  assertRateLimit(studentId) {
    const key = String(studentId || "").trim().toLowerCase();
    if (!key) {
      return;
    }
    const now = Date.now();
    const windowMs = 60_000;
    const rows = Array.isArray(this.rateWindows.get(key)) ? this.rateWindows.get(key) : [];
    const pruned = rows.filter((stamp) => now - stamp < windowMs);
    if (pruned.length >= this.ratePerMinute) {
      const error = new Error("AI coach rate limit exceeded. Please wait a moment.");
      error.code = "ai_rate_limited";
      throw error;
    }
    pruned.push(now);
    this.rateWindows.set(key, pruned);
  }

  normalizeHistory(historyInput) {
    const rows = Array.isArray(historyInput) ? historyInput : [];
    return rows
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: clampText(row.text, 500)
      }))
      .filter((row) => row.content.length > 0)
      .slice(-(this.maxHistoryTurns * 2));
  }

  updateRecordWithChat(recordInput, { promptKey, result, fallbackUsed }) {
    const record = normalizeCoachRecord(recordInput);
    record.updatedAt = nowIso();
    record.counters.requests += 1;
    if (result?.signals?.offTopic) {
      record.counters.offTopicRedirects += 1;
    }
    if (fallbackUsed) {
      record.counters.fallbacks += 1;
    }

    const quality = qualityFromSignals(result.signals || {});
    const alignment = String(result?.signals?.alignment || "partial");
    const needsRevision = alignment !== "aligned" || quality !== "high";
    const focusArea = focusAreaFromChatSignals(result?.signals || {});

    record.latestByPrompt[promptKey] = {
      quality,
      alignment,
      needsRevision,
      updatedAt: record.updatedAt,
      focusArea
    };

    pushRecentSignal(record, promptKey, {
      at: record.updatedAt,
      kind: "chat",
      quality,
      alignment,
      needsRevision,
      offTopic: Boolean(result?.signals?.offTopic),
      fallbackUsed: Boolean(fallbackUsed)
    });

    record.teacherSnapshot = deriveTeacherSnapshot(record.latestByPrompt);
    return record;
  }

  updateRecordWithEvaluation(recordInput, { promptKey, result, fallbackUsed }) {
    const record = normalizeCoachRecord(recordInput);
    record.updatedAt = nowIso();
    record.counters.requests += 1;
    if (fallbackUsed) {
      record.counters.fallbacks += 1;
    }

    const quality = qualityFromRubric(result.rubric || {});
    const alignment = String(result.alignment || "partial");
    const needsRevision = alignment !== "aligned" || quality !== "high";
    const focusArea = focusAreaFromRubric(result.rubric || {});

    record.latestByPrompt[promptKey] = {
      quality,
      alignment,
      needsRevision,
      updatedAt: record.updatedAt,
      focusArea
    };

    pushRecentSignal(record, promptKey, {
      at: record.updatedAt,
      kind: "evaluate",
      quality,
      alignment,
      needsRevision,
      offTopic: false,
      fallbackUsed: Boolean(fallbackUsed)
    });

    record.teacherSnapshot = deriveTeacherSnapshot(record.latestByPrompt);
    return record;
  }

  async coachChat({
    studentId = "",
    lessonId = "spokes-goal-journey-v1",
    context = {},
    message = "",
    history = [],
    allowRewrite = true,
    record = null
  } = {}) {
    this.assertRateLimit(studentId);

    const classification = classifyChatInput({
      message,
      context,
      maxInputChars: this.maxInputChars
    });
    const promptKey = classification.promptKey;
    const sanitizedGoals = sanitizeGoals(context?.goals);
    const sanitizedSmart = sanitizeSmartDraft(context?.smartDraft);
    let fallbackUsed = false;
    let usageProvider = this.provider;
    let usageLatency = 0;
    let result;

    if (classification.injection || classification.offTopic) {
      fallbackUsed = true;
      usageProvider = "policy";
      result = buildRedirectReply({
        promptKey,
        injection: classification.injection
      });
      result = normalizeChatResult(result);
    } else if (!this.enabled) {
      fallbackUsed = true;
      usageProvider = "heuristic";
      result = normalizeChatResult(heuristicChat({
        context: {
          promptKey,
          goals: sanitizedGoals,
          smartDraft: sanitizedSmart
        },
        message: classification.message,
        allowRewrite: Boolean(allowRewrite)
      }));
    } else {
      try {
        const system = buildSystemPrompt({ promptKey, allowRewrite: Boolean(allowRewrite) });
        const messages = [
          { role: "system", content: system },
          ...this.normalizeHistory(history),
          {
            role: "user",
            content: JSON.stringify({
              lessonId: String(lessonId || "spokes-goal-journey-v1"),
              context: {
                promptKey,
                level: Math.max(1, toNumber(context?.level, 1)),
                goals: sanitizedGoals,
                smartDraft: sanitizedSmart
              },
              message: classification.message,
              allowRewrite: Boolean(allowRewrite)
            })
          }
        ];

        const llm = await this.client.chatJson({ messages });
        usageLatency = llm.latencyMs;
        const parsed = safeParseJson(llm.content);
        if (!parsed) {
          const error = new Error("AI response was not valid JSON.");
          error.code = "ai_invalid_json";
          throw error;
        }
        result = normalizeChatResult(parsed);
      } catch (_error) {
        fallbackUsed = true;
        usageProvider = "heuristic";
        result = normalizeChatResult(heuristicChat({
          context: {
            promptKey,
            goals: sanitizedGoals,
            smartDraft: sanitizedSmart
          },
          message: classification.message,
          allowRewrite: Boolean(allowRewrite)
        }));
      }
    }

    const response = {
      ...result,
      usage: {
        provider: usageProvider,
        model: this.model,
        latencyMs: usageLatency,
        fallbackUsed
      }
    };
    const nextRecord = this.updateRecordWithChat(record, {
      promptKey,
      result: response,
      fallbackUsed
    });

    return {
      response,
      record: nextRecord
    };
  }

  async coachEvaluate({
    studentId = "",
    promptKey = "monthly",
    candidateText = "",
    parentGoals = {},
    allowRewrite = true,
    record = null
  } = {}) {
    this.assertRateLimit(studentId);
    const cleanPrompt = normalizePromptKey(promptKey);
    const cleanCandidate = clampText(candidateText, this.maxInputChars);
    const cleanParents = sanitizeGoals(parentGoals);

    let fallbackUsed = false;
    let result;
    if (!this.enabled) {
      fallbackUsed = true;
      result = normalizeEvaluateResult(heuristicEvaluate({
        promptKey: cleanPrompt,
        candidateText: cleanCandidate,
        parentGoals: cleanParents,
        allowRewrite: Boolean(allowRewrite)
      }));
    } else {
      try {
        const system = buildEvaluateSystemPrompt({
          promptKey: cleanPrompt,
          allowRewrite: Boolean(allowRewrite)
        });
        const messages = [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              promptKey: cleanPrompt,
              candidateText: cleanCandidate,
              parentGoals: cleanParents,
              allowRewrite: Boolean(allowRewrite)
            })
          }
        ];

        const llm = await this.client.chatJson({ messages });
        const parsed = safeParseJson(llm.content);
        if (!parsed) {
          const error = new Error("AI response was not valid JSON.");
          error.code = "ai_invalid_json";
          throw error;
        }
        result = normalizeEvaluateResult(parsed);
      } catch (_error) {
        fallbackUsed = true;
        result = normalizeEvaluateResult(heuristicEvaluate({
          promptKey: cleanPrompt,
          candidateText: cleanCandidate,
          parentGoals: cleanParents,
          allowRewrite: Boolean(allowRewrite)
        }));
      }
    }

    const nextRecord = this.updateRecordWithEvaluation(record, {
      promptKey: cleanPrompt,
      result,
      fallbackUsed
    });

    return {
      response: result,
      record: nextRecord
    };
  }
}

function createCoachService(config = {}) {
  return new CoachService(config);
}

module.exports = {
  createCoachService,
  normalizeCoachRecord,
  defaultTeacherSnapshot
};
