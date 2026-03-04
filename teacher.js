const KEY_STORAGE = "spokesTeacherKeyV1";

const ui = {
  keyInput: document.getElementById("teacherKey"),
  loadButton: document.getElementById("loadReport"),
  exportButton: document.getElementById("exportCsv"),
  printButton: document.getElementById("printReport"),
  status: document.getElementById("status"),
  generatedAt: document.getElementById("generatedAt"),
  tableBody: document.getElementById("tableBody"),
  studentsCount: document.getElementById("studentsCount"),
  avgLevel: document.getElementById("avgLevel"),
  activeStreaks: document.getElementById("activeStreaks"),
  checkpointCount: document.getElementById("checkpointCount"),
};

init();

function init() {
  const saved = localStorage.getItem(KEY_STORAGE) || "";
  if (ui.keyInput && saved) {
    ui.keyInput.value = saved;
  }

  ui.loadButton?.addEventListener("click", () => {
    loadOverview();
  });

  ui.exportButton?.addEventListener("click", () => {
    exportCsv();
  });

  ui.printButton?.addEventListener("click", () => {
    window.print();
  });

  if (saved) {
    loadOverview();
  }
}

function currentTeacherKey() {
  return String(ui.keyInput?.value || "").trim();
}

function setStatus(message, tone = "neutral") {
  if (!ui.status) {
    return;
  }
  ui.status.textContent = message;
  ui.status.dataset.tone = tone;
}

async function loadOverview() {
  const key = currentTeacherKey();
  if (!key) {
    setStatus("Enter instructor key first.", "error");
    return;
  }

  localStorage.setItem(KEY_STORAGE, key);
  setStatus("Loading report...", "neutral");

  try {
    const response = await fetch("/api/teacher/overview", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-teacher-key": key
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed (${response.status})`);
    }

    renderOverview(payload);
    setStatus("Report loaded.", "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not load report.", "error");
    ui.tableBody.innerHTML = '<tr><td colspan="8">Report unavailable.</td></tr>';
  }
}

async function exportCsv() {
  const key = currentTeacherKey();
  if (!key) {
    setStatus("Enter instructor key first.", "error");
    return;
  }

  localStorage.setItem(KEY_STORAGE, key);
  setStatus("Preparing CSV export...", "neutral");

  try {
    const response = await fetch("/api/teacher/export.csv", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "text/csv",
        "x-teacher-key": key
      }
    });

    if (!response.ok) {
      let message = `Export failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload?.error) {
          message = payload.error;
        }
      } catch (_error) {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spokes-teacher-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("CSV exported.", "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not export CSV.", "error");
  }
}

function renderOverview(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];

  const checkpointCount = rows.filter((row) => row.checkpointsComplete).length;
  const avgLevel = rows.length
    ? (rows.reduce((sum, row) => sum + Number(row.level || 0), 0) / rows.length).toFixed(1)
    : 0;
  const activeStreaks = rows.filter((row) => Number(row.currentStreak || 0) > 0).length;

  ui.studentsCount.textContent = String(rows.length);
  ui.checkpointCount.textContent = String(checkpointCount);
  ui.avgLevel.textContent = String(avgLevel);
  ui.activeStreaks.textContent = String(activeStreaks);

  ui.generatedAt.textContent = payload?.generatedAt
    ? `Generated ${formatDateTime(payload.generatedAt)}`
    : "Not generated";

  if (!rows.length) {
    ui.tableBody.innerHTML = '<tr><td colspan="8">No student drafts available yet.</td></tr>';
    return;
  }

  ui.tableBody.innerHTML = rows.map((row) => {
    return `<tr>
      <td><strong>${escapeHtml(row.displayName || row.studentId)}</strong><br><small>${escapeHtml(row.studentId)}</small></td>
      <td><span class="badge level">L${Number(row.level || 1)}</span></td>
      <td>${Number(row.xp || 0)}</td>
      <td>${Number(row.currentStreak || 0)}<small> (best ${Number(row.longestStreak || 0)})</small></td>
      <td>${Number(row.corePromptsCompleted || row.promptCompleted || 0)}/${Number(row.promptTotal || 0)}</td>
      <td>${Number(row.growthPromptsCompleted || 0)}</td>
      <td>${Number(row.dailyDone || 0)}/${Number(row.dailyTotal || 0)}</td>
      <td>${escapeHtml(formatDateTime(row.updatedAt))}</td>
    </tr>`;
  }).join("");
}

function formatDateTime(iso) {
  if (!iso) {
    return "-";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return String(iso);
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
