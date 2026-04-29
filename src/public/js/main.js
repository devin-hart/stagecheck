/**
 * src/public/js/main.js
 * StageCheck — Portfolio View & Audit Controller
 */

let allPageData = [];
let currentPageIndex = null;
let currentDevice = "desktop";

const PI_API_URL = "https://rpi4.tailbfccfb.ts.net/api/audit";
const BRIDGE_BASE_URL = new URL(PI_API_URL).origin;
const AUDIT_API_KEY = "stagecheck_9f3b2a7c8d";
const LOCAL_STREAM_URL = "/api/manual-audit-stream"; // Keep manual local

// DOM cache
const elements = {
  resultsContainer: null,
  issuesList: null,
  filters: null,
  dateEl: null,
  runBtn: null,
  numErrors: null,
  numWarnings: null,
  numTotal: null,
  numTotalLabel: null,
  urlInput: null,
  themeToggle: null,
  siteHealth: null,
  healthBar: null,
  exportPdfBtn: null,
  auditStatus: null,
  statusText: null,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function initElements() {
  elements.resultsContainer = document.getElementById("results");
  elements.issuesList = document.getElementById("issuesList");
  elements.filters = document.getElementById("filters");
  elements.dateEl = document.querySelector(".header-subtitle");
  elements.runBtn = document.getElementById("runBtn");
  elements.numErrors = document.getElementById("numErrors");
  elements.numWarnings = document.getElementById("numWarnings");
  elements.numTotal = document.getElementById("numTotal");
  elements.numTotalLabel = document.querySelector(
    ".stat-card:nth-child(3) .stat-label",
  );
  elements.urlInput = document.getElementById("urlInput");
  elements.themeToggle = document.getElementById("themeToggle");
  elements.siteHealth = document.getElementById("siteHealth");
  elements.healthBar = document.getElementById("healthBar");
  elements.exportPdfBtn = document.getElementById("exportPdfBtn");
  elements.auditStatus = document.getElementById("audit-status");
  elements.statusText = document.getElementById("status-text");

  elements.themeToggle.addEventListener("change", toggleTheme);

  if (elements.exportPdfBtn) {
    elements.exportPdfBtn.addEventListener("click", () => window.print());
  }

  elements.issuesList.addEventListener("click", (e) => {
    const card = e.target.closest(".page-card");
    if (card && elements.issuesList.classList.contains("page-grid")) {
      viewPageReport(parseInt(card.dataset.index, 10));
    }
  });

  // Local Mode Safety Switch
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const controls = document.querySelector(".controls");
  if (!isLocal && controls) {
    controls.style.display = "none";
  }
}

// ─── Dashboard Init ───────────────────────────────────────────────────────────

async function initDashboard() {
  if (!elements.resultsContainer) initElements();

  if (document.documentElement.classList.contains("dark-mode")) {
    elements.themeToggle.checked = true;
  }

  renderSkeletons();
  elements.resultsContainer.style.display = "block";

  try {
    const res = await fetch(`${PI_API_URL}?t=${Date.now()}`, {
      headers: { "x-api-key": AUDIT_API_KEY },
    });
    if (!res.ok) throw new Error("Audit API is offline");

    const data = await res.json();
    allPageData = Array.isArray(data) ? data : [data];

    if (allPageData[0]?.auditedAt) {
      const auditDate = new Date(allPageData[0].auditedAt);
      elements.dateEl.textContent = `Last audit: ${auditDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }

    renderPortfolioGrid();
  } catch (err) {
    console.error("Dashboard Init Error:", err);
    elements.issuesList.innerHTML = `
      <div class="empty" role="alert">
        <p>Could not reach the audit API. Check your connection.</p>
      </div>`;
  }
}

// ─── Manual Audit (Streaming) ───────────────────────────────────────────────────

function showStatus(msg) {
  if (elements.auditStatus) {
    elements.statusText.textContent = msg;
    elements.auditStatus.classList.remove("audit-status-hidden");
  }
}

function hideStatus() {
  if (elements.auditStatus) {
    elements.auditStatus.classList.add("audit-status-hidden");
  }
}

async function triggerManualAudit() {
  const url = elements.urlInput.value.trim();
  if (!url) return;

  elements.runBtn.disabled = true;
  elements.runBtn.textContent = "Working…";

  try {
    renderSkeletons(1);
    showStatus("Initializing browser...");

    // Use the local streaming endpoint
    const streamUrl = `${LOCAL_STREAM_URL}?url=${encodeURIComponent(url)}&key=${AUDIT_API_KEY}`;
    const response = await fetch(streamUrl);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // Keep partial line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.replace("data: ", "");
        try {
          const data = JSON.parse(jsonStr);
          if (data.status) {
            showStatus(data.status);
          } else if (data.result) {
            handleAuditSuccess(data.result, url);
          } else if (data.error) {
            throw new Error(data.error);
          }
        } catch (e) {
          console.error("Error parsing stream line:", e);
        }
      }
    }
  } catch (err) {
    console.error("Manual Audit Error:", err);
    showStatus(`Error: ${err.message}`);
    setTimeout(hideStatus, 5000);
  } finally {
    elements.runBtn.disabled = false;
    elements.runBtn.textContent = "Run Audit";
    hideStatus();
  }
}

function handleAuditSuccess(report, url) {
  const existingIndex = allPageData.findIndex((p) => p.url === url);
  if (existingIndex !== -1) {
    allPageData[existingIndex] = report;
    viewPageReport(existingIndex);
  } else {
    allPageData.unshift(report);
    viewPageReport(0);
  }
}

// ─── TIER 1: Portfolio Grid ───────────────────────────────────────────────────

function renderPortfolioGrid() {
  currentPageIndex = null;
  if (elements.exportPdfBtn) elements.exportPdfBtn.style.display = "none";

  const totals = allPageData.reduce(
    (acc, page) => {
      Object.values(page.devices).forEach((report) => {
        if (report.summary) {
          acc.errors += report.summary.errors || 0;
          acc.warnings += report.summary.warnings || 0;
        }
      });
      return acc;
    },
    { errors: 0, warnings: 0 },
  );

  elements.numErrors.textContent = totals.errors;
  elements.numWarnings.textContent = totals.warnings;
  elements.numTotal.textContent = allPageData.length;
  elements.numTotalLabel.textContent = "Pages Scanned";

  calculateSiteHealth();

  elements.filters.innerHTML = "";
  elements.issuesList.className = "page-grid";

  elements.issuesList.innerHTML = allPageData
    .map((page, index) => {
      const urlObj = new URL(page.url);
      let displayPath = urlObj.pathname === "/" ? "Home" : urlObj.pathname;
      if (displayPath.length > 30) {
        displayPath =
          "…" + displayPath.split("/").filter(Boolean).pop().replace(/-/g, " ");
      }

      let totalErrors = 0;
      let totalWarnings = 0;
      Object.values(page.devices).forEach((d) => {
        totalErrors += d.summary?.errors || 0;
        totalWarnings += d.summary?.warnings || 0;
      });

      const deviceKeys = Object.keys(page.devices);
      const repKey = page.devices.desktop ? "desktop" : deviceKeys[0];
      const representative = page.devices[repKey] || {};
      const heroScreenshot = representative.screenshot;

      // Smart path: handle both Base64 and File paths
      const screenshotUrl =
        heroScreenshot && heroScreenshot.startsWith("data:")
          ? heroScreenshot
          : heroScreenshot
            ? `${BRIDGE_BASE_URL}${heroScreenshot}`
            : "";

      const totalCount = totalErrors + totalWarnings;
      const deviceCount = deviceKeys.length;
      const deviceLabel = deviceCount === 1 ? repKey : "Multi-device";
      const loadTime = representative.loadTime || "";

      return `
      <button class="page-card" data-index="${index}"
        aria-label="View report for ${escapeHtml(displayPath)}: ${totalErrors} errors, ${totalWarnings} warnings">
        <div class="page-hero lazy-bg" data-src="${screenshotUrl}" aria-hidden="true">
          ${!heroScreenshot ? '<div class="no-screenshot">No Snapshot</div>' : ""}
        </div>
        <div class="page-card-body">
          <div class="page-scores" aria-hidden="true">
            <div class="page-score ${totalErrors > 0 ? "bad" : "good"}">${totalErrors}</div>
            ${totalWarnings > 0 ? `<div class="page-score warning">${totalWarnings}</div>` : ""}
          </div>
          <div class="page-info">
            <span class="page-url">${escapeHtml(displayPath)}</span>
            <span class="page-meta">${deviceLabel} · ${totalCount} issue${totalCount !== 1 ? "s" : ""}${loadTime ? ` · ${loadTime}` : ""}</span>
          </div>
        </div>
      </button>`;
    })
    .join("");

  initLazyLoading();
}

// ─── TIER 2: Issue Report ─────────────────────────────────────────────────────

function viewPageReport(index, device = null) {
  currentPageIndex = index;
  const page = allPageData[index];

  if (!device) {
    device = page.devices.desktop ? "desktop" : Object.keys(page.devices)[0];
  }
  currentDevice = device;
  if (elements.exportPdfBtn)
    elements.exportPdfBtn.style.display = "inline-flex";
  const report = page.devices[device] || {};
  const issues = report.issues || [];

  elements.numErrors.textContent = report.summary?.errors || 0;
  elements.numWarnings.textContent = report.summary?.warnings || 0;
  elements.numTotal.textContent = report.summary?.total || 0;
  elements.numTotalLabel.textContent = "Device Issues";

  elements.filters.innerHTML = "";

  const categories = [
    ...new Set(issues.map((i) => i.category).filter(Boolean)),
  ];
  const filtersHtml =
    categories.length > 0
      ? `
    <nav class="filters" aria-label="Filter issues by category">
      <button class="filter-btn active" data-filter="all" aria-pressed="true">All</button>
      ${categories.map((cat) => `<button class="filter-btn" data-filter="${cat}">${formatCategory(cat)}</button>`).join("")}
    </nav>`
      : "";

  // Smart path: handle both Base64 and File paths for screenshot
  const screenshotUrl =
    report.screenshot && report.screenshot.startsWith("data:")
      ? report.screenshot
      : report.screenshot
        ? `${BRIDGE_BASE_URL}${report.screenshot}`
        : "";

  elements.issuesList.className = "";
  elements.issuesList.innerHTML = `
    <button onclick="renderPortfolioGrid()" class="back-btn">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      All Pages
    </button>
    <div class="report-header">
      <div class="report-title-row">
        <p class="report-url">Results for <code>${escapeHtml(page.url)}</code></p>
        <div class="device-tabs">
          <button class="device-tab ${device === "desktop" ? "active" : ""}" onclick="viewPageReport(${index}, 'desktop')">Desktop</button>
          <button class="device-tab ${device === "tablet" ? "active" : ""}" onclick="viewPageReport(${index}, 'tablet')">Tablet</button>
          <button class="device-tab ${device === "mobile" ? "active" : ""}" onclick="viewPageReport(${index}, 'mobile')">Mobile</button>
        </div>
      </div>
      ${report.screenshot ? `<div class="report-screenshot"><img src="${screenshotUrl}" alt="Page Snapshot"></div>` : ""}
      ${renderPerfPanel(report)}
    </div>
    ${filtersHtml}
    <div id="issueListBody"></div>
  `;

  const filtersEl = elements.issuesList.querySelector(".filters");
  if (filtersEl) {
    filtersEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      filtersEl
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderIssueList(issues, btn.dataset.filter);
    });
  }
  renderIssueList(issues, "all");
}

function renderIssueList(issues, filter = "all") {
  const filtered =
    filter === "all" ? issues : issues.filter((i) => i.category === filter);
  const container = document.getElementById("issueListBody");
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty" role="status">No ${filter === "all" ? "" : formatCategory(filter) + " "}issues found.</div>`;
    return;
  }

  container.innerHTML = `<ol class="issues">${filtered
    .map(
      (issue) => `
    <li>
      <article class="issue ${issue.type}">
        <div class="issue-top">
          <h3 class="issue-title">${issue.title}</h3>
          <span class="badge badge-${issue.category}">${formatCategory(issue.category)}</span>
        </div>
        ${issue.detail ? `<p class="issue-detail">${issue.detail}</p>` : ""}
        ${renderElements(issue)}
        ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Guide</a></div>` : ""}
      </article>
    </li>`,
    )
    .join("")}</ol>`;
}

function renderElements(issue) {
  const elems = issue.elements || (issue.selector ? [issue.selector] : null);
  if (!elems || !Array.isArray(elems) || elems.length === 0) return "";
  return `<div class="issue-elements">${elems
    .map((el) => {
      const selector = typeof el === "string" ? el : el.selector;
      const htmlSnippet = typeof el === "object" ? el.html : null;
      return `<div class="issue-element"><div class="el-selector"><code>${escapeHtml(selector)}</code></div>
    ${htmlSnippet ? `<pre class="el-snippet"><code>${escapeHtml(htmlSnippet)}</code></pre>` : ""}</div>`;
    })
    .join("")}</div>`;
}

// ─── Theme & Helpers ───────────────────────────────────────────────────────────

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark-mode");
  document.body.classList.toggle("dark-mode", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function renderPerfPanel(page) {
  const r = page.resources;
  if (!r) return "";
  return `<div class="perf-panel">
    <div class="perf-metric"><span class="perf-label">LCP</span><span class="perf-value">${r.lcp}</span></div>
    <div class="perf-metric"><span class="perf-label">CLS</span><span class="perf-value">${r.cls}</span></div>
    <div class="perf-metric"><span class="perf-label">Requests</span><span class="perf-value">${r.requestCount}</span></div>
    <div class="perf-metric"><span class="perf-label">Size</span><span class="perf-value">${r.pageSize}</span></div>
  </div>`;
}

function calculateSiteHealth() {
  if (allPageData.length === 0) return;
  let totalScore = 0;
  allPageData.forEach((page) => {
    let pageScore = 100;
    let pageErrors = 0;
    let pageWarnings = 0;

    Object.values(page.devices).forEach((deviceReport) => {
      pageErrors += deviceReport.summary?.errors || 0;
      pageWarnings += deviceReport.summary?.warnings || 0;
    });

    pageScore -= pageErrors * 5;
    pageScore -= pageWarnings * 2;
    totalScore += Math.max(0, pageScore);
  });
  const avgScore = Math.round(totalScore / allPageData.length);
  if (elements.siteHealth) elements.siteHealth.textContent = `${avgScore}%`;
  if (elements.healthBar) elements.healthBar.style.width = `${avgScore}%`;
}

function formatCategory(cat) {
  return cat
    ? cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
}
function escapeHtml(str) {
  return str
    ? str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
    : "";
}

function initLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const src = el.getAttribute("data-src");
        if (src) {
          el.style.backgroundImage = `url('${src}')`;
          el.classList.add("loaded");
        }
        observer.unobserve(el);
      }
    });
  });
  document.querySelectorAll(".lazy-bg").forEach((el) => observer.observe(el));
}

function renderSkeletons(count = 8) {
  elements.issuesList.className = "page-grid";
  elements.issuesList.innerHTML = Array(count)
    .fill(0)
    .map(
      () => `
    <div class="skeleton-card"><div class="skeleton skeleton-hero"></div>
    <div class="page-card-body"><div class="skeleton-scores"><div class="skeleton skeleton-score"></div></div></div></div>`,
    )
    .join("");
}

window.triggerManualAudit = triggerManualAudit;
window.renderPortfolioGrid = renderPortfolioGrid;
window.addEventListener("DOMContentLoaded", initDashboard);
