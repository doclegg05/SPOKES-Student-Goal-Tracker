const ALIGNMENT_SET = new Set(["aligned", "partial", "misaligned"]);
const SIGNAL_BAND_SET = new Set(["low", "medium", "high"]);
const RUBRIC_SET = new Set(["yes", "needs_work"]);

function asTrimmed(value, fallback = "", maxChars = 500) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return fallback;
  }
  return text.slice(0, maxChars);
}

function asEnum(value, allowed, fallback) {
  const text = String(value || "").trim().toLowerCase();
  return allowed.has(text) ? text : fallback;
}

function safeParseJson(text) {
  if (typeof text !== "string") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function normalizeChatResult(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const signals = src.signals && typeof src.signals === "object" ? src.signals : {};

  return {
    reply: asTrimmed(src.reply, "Let's focus on one specific next step for your goal.", 600),
    followUpQuestion: asTrimmed(src.followUpQuestion, "What is your next concrete action?", 240),
    rewriteSuggestion: asTrimmed(src.rewriteSuggestion, "", 500),
    signals: {
      offTopic: Boolean(signals.offTopic),
      alignment: asEnum(signals.alignment, ALIGNMENT_SET, "partial"),
      specificity: asEnum(signals.specificity, SIGNAL_BAND_SET, "medium"),
      measurable: asEnum(signals.measurable, SIGNAL_BAND_SET, "medium"),
      timeBound: asEnum(signals.timeBound, SIGNAL_BAND_SET, "medium")
    }
  };
}

function normalizeEvaluateResult(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const rubric = src.rubric && typeof src.rubric === "object" ? src.rubric : {};

  return {
    rubric: {
      specific: asEnum(rubric.specific, RUBRIC_SET, "needs_work"),
      measurable: asEnum(rubric.measurable, RUBRIC_SET, "needs_work"),
      achievable: asEnum(rubric.achievable, RUBRIC_SET, "needs_work"),
      relevant: asEnum(rubric.relevant, RUBRIC_SET, "needs_work"),
      timeBound: asEnum(rubric.timeBound, RUBRIC_SET, "needs_work")
    },
    alignment: asEnum(src.alignment, ALIGNMENT_SET, "partial"),
    coachFeedback: asTrimmed(src.coachFeedback, "Refine this goal with clearer metrics and timeline.", 420),
    rewriteSuggestion: asTrimmed(src.rewriteSuggestion, "", 500),
    nextQuestion: asTrimmed(src.nextQuestion, "What is one specific next step with a deadline?", 220)
  };
}

module.exports = {
  safeParseJson,
  normalizeChatResult,
  normalizeEvaluateResult
};
