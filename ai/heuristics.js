const { clampText, normalizePromptKey } = require("./policy");

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function toWords(value) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function overlapRatio(a, b) {
  const left = new Set(toWords(a));
  const right = new Set(toWords(b));
  if (!left.size || !right.size) {
    return 0;
  }

  let hits = 0;
  left.forEach((word) => {
    if (right.has(word)) {
      hits += 1;
    }
  });

  return hits / Math.max(left.size, right.size);
}

function hasNumber(text) {
  return /\d/.test(text) || /\b(per|each|weekly|daily|times|hours?|minutes?|percent)\b/i.test(text);
}

function hasTimeBound(text) {
  return /\b(by|before|after|within|week|month|quarter|year|today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})\b/i.test(text);
}

function hasActionVerb(text) {
  return /\b(apply|complete|submit|practice|study|finish|build|draft|revise|schedule|prepare|call|email|review)\b/i.test(text);
}

function scoreBand(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function qualityFromRubric(rubric) {
  const yesCount = Object.values(rubric || {}).filter((value) => value === "yes").length;
  if (yesCount >= 4) return "high";
  if (yesCount >= 2) return "medium";
  return "low";
}

function detectAlignment(candidateText, parentGoals = {}) {
  const text = String(candidateText || "");
  const parents = [parentGoals.bhag, parentGoals.monthly, parentGoals.weekly, parentGoals.daily]
    .filter(Boolean)
    .join(" ");
  const ratio = overlapRatio(text, parents);
  if (ratio >= 0.2) return "aligned";
  if (ratio >= 0.08) return "partial";
  return "misaligned";
}

function buildRewrite(text, promptKey) {
  const clean = clampText(text, 500);
  if (!clean) return "";

  const parts = [];
  if (!hasActionVerb(clean)) {
    parts.push("Complete");
  }
  parts.push(clean.replace(/\.+$/, ""));
  if (!hasNumber(clean)) {
    parts.push("with at least one measurable outcome");
  }
  if (!hasTimeBound(clean)) {
    parts.push("by a clear date this week");
  }

  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  if (promptKey === "tasks") {
    return `1. ${joined}\n2. Track completion in Mission Control`;
  }
  return joined;
}

function firstGapQuestion({ rubric, promptKey }) {
  if (rubric.measurable !== "yes") {
    return "How will you measure success with a number, count, or checkpoint?";
  }
  if (rubric.timeBound !== "yes") {
    return "What exact date or deadline will you commit to?";
  }
  if (rubric.specific !== "yes") {
    return "What exact action will you take first?";
  }
  if (promptKey === "weekly") {
    return "How does this weekly goal move your monthly goal forward?";
  }
  if (promptKey === "daily") {
    return "What is the one highest-impact task for today?";
  }
  return "What obstacle might block this, and what is your if-then plan?";
}

function deriveRubric(candidateText, parentGoals) {
  const text = String(candidateText || "").trim();
  const alignment = detectAlignment(text, parentGoals);
  const rubric = {
    specific: text.length >= 18 && hasActionVerb(text) ? "yes" : "needs_work",
    measurable: hasNumber(text) ? "yes" : "needs_work",
    achievable: text.length <= 220 ? "yes" : "needs_work",
    relevant: alignment !== "misaligned" ? "yes" : "needs_work",
    timeBound: hasTimeBound(text) ? "yes" : "needs_work"
  };

  return { rubric, alignment };
}

function heuristicEvaluate({ promptKey = "monthly", candidateText = "", parentGoals = {}, allowRewrite = true } = {}) {
  const cleanPrompt = normalizePromptKey(promptKey);
  const { rubric, alignment } = deriveRubric(candidateText, parentGoals);
  const quality = qualityFromRubric(rubric);
  const nextQuestion = firstGapQuestion({ rubric, promptKey: cleanPrompt });
  const rewriteSuggestion = allowRewrite ? buildRewrite(candidateText, cleanPrompt) : "";
  const coachFeedback = (() => {
    if (quality === "high" && alignment === "aligned") {
      return "Strong goal draft. Keep the language concrete and review progress at your next checkpoint.";
    }
    if (alignment === "misaligned") {
      return "This goal may not connect clearly to your higher-level plan yet. Tighten the connection to your parent goal.";
    }
    return "Good start. Strengthen measurable and time-bound details so progress is easier to track.";
  })();

  return {
    rubric,
    alignment,
    coachFeedback: clampText(coachFeedback, 420),
    rewriteSuggestion: clampText(rewriteSuggestion, 500),
    nextQuestion: clampText(nextQuestion, 220)
  };
}

function heuristicChat({ context = {}, message = "", allowRewrite = true } = {}) {
  const promptKey = normalizePromptKey(context.promptKey);
  const goals = context.goals || {};
  const candidateText = String(message || "").trim() || String(goals[promptKey] || "").trim();
  const parentGoals = {
    bhag: goals.bhag || "",
    monthly: goals.monthly || "",
    weekly: goals.weekly || "",
    daily: goals.daily || ""
  };

  const evaluation = heuristicEvaluate({
    promptKey,
    candidateText,
    parentGoals,
    allowRewrite
  });

  const specificity = evaluation.rubric.specific === "yes" ? "high" : "low";
  const measurable = evaluation.rubric.measurable === "yes" ? "high" : "low";
  const timeBound = evaluation.rubric.timeBound === "yes" ? "high" : "low";
  const reply = evaluation.coachFeedback;

  return {
    reply: clampText(reply, 600),
    followUpQuestion: clampText(evaluation.nextQuestion, 240),
    rewriteSuggestion: clampText(evaluation.rewriteSuggestion, 500),
    signals: {
      offTopic: false,
      alignment: evaluation.alignment,
      specificity: scoreBand(specificity === "high" ? 1 : 0.2),
      measurable: scoreBand(measurable === "high" ? 1 : 0.2),
      timeBound: scoreBand(timeBound === "high" ? 1 : 0.2)
    }
  };
}

module.exports = {
  heuristicChat,
  heuristicEvaluate,
  qualityFromRubric
};
