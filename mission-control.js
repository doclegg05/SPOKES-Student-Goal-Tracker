import { MissionModel } from "./mission-model.js";
import { MissionView } from "./mission-view.js";
import { MissionController } from "./mission-controller.js";

const FALLBACK_TOTAL_FRAMES = 193;
const DEFAULT_LESSON_ID = "spokes-goal-journey-v1";

async function resolveModelConfig() {
  const runtimeConfig = window.__SPOKES_CONFIG__ || {};
  const config = {
    totalFrames: FALLBACK_TOTAL_FRAMES,
    apiBase: typeof runtimeConfig.apiBase === "string" ? runtimeConfig.apiBase : "/api",
    lessonId: typeof runtimeConfig.lessonId === "string" ? runtimeConfig.lessonId : DEFAULT_LESSON_ID
  };

  try {
    const response = await fetch("./frames/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      return config;
    }

    const manifest = await response.json();
    const frameCount = Number(manifest?.frameCount);

    if (Number.isFinite(frameCount) && frameCount > 0) {
      config.totalFrames = Math.floor(frameCount);
    }
  } catch (error) {
    console.warn("Could not load frame manifest. Using fallback frame count.", error);
  }

  return config;
}

export async function initMissionControl() {
  const modelConfig = await resolveModelConfig();
  const model = new MissionModel(modelConfig);

  if (!model.hasCloudSession()) {
    window.location.replace("/");
    return;
  }

  const restoredSession = await model.restoreSession();
  if (!restoredSession) {
    window.location.replace("/");
    return;
  }

  const view = new MissionView(document);
  const controller = new MissionController({ model, view, win: window });
  controller.init();
}
