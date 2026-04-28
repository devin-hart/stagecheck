/**
 * src/public/js/main.js
 * Refactored for Raspberry Pi Bridge Architecture.
 */

let allIssues = [];
let activeFilter = "all";

// Replace with your public Cloudflare Tunnel URL
const PI_API_URL = "https://aud-two-strange-cdt.trycloudflare.com/api/audit";

/**
 * Automatically fetch the latest results when the page loads.
 */
async function initDashboard() {
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");

  status.className = "status running";
  status.textContent = "Connecting to Raspberry Pi Auditor...";
  resultsContainer.style.display = "none";

  try {
    const res = await fetch(PI_API_URL);
    if (!res.ok) throw new Error("Pi API is unreachable");
    
    const data = await res.json();
    
    // The Pi saves an array of audits; we'll render the most recent entry.
    const latestAudit = Array.isArray(data) ? data[0] : data;

    status.className = "status";
    status.textContent = `Latest Audit: ${new Date(latestAudit.auditedAt).toLocaleString()}`;
    
    renderResults(latestAudit);
  } catch (err) {
    status.className = "status error";
    status.textContent = "Bridge Error: " + err.message;
    console.error("Fetch failure:", err);
  }
}

/**
 * Populates the summary stats and filter buttons.
 */
function renderResults(data) {
  allIssues = data.issues || [];
  activeFilter = "all";

  // Update Summary Stats
  document.getElementById("numErrors").textContent = data.summary?.errors || 0;
  document.getElementById("numWarnings").textContent = data.summary?.warnings || 0;
  document.getElementById("numTotal").textContent = data.summary?.total || 0;
  document.getElementById("numPassed").textContent = "—";

  // Generate Filter Buttons
  const categories = ["all", ...new Set(allIssues.map((i) => i.category))];
  const filtersEl = document.getElementById("filters");
  
  filtersEl.innerHTML = categories
    .map(
      (c) => `
      <button class="filter-btn ${c === "all" ? "active" : ""}" 
              onclick="setFilter('${c}')">
        ${c === "all" ? "All issues" : c.toUpperCase()}
      </button>
    `,
    )
    .join("");

  renderIssues();
  document.getElementById("results").style.display = "block";
}

/**
 * Handles category filtering.
 */
function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll(".filter-btn").forEach((b) => {
    const btnText = b.textContent.trim().toLowerCase();
    const isAll = cat === "all" && btnText === "all issues";
    const isMatch = btnText === cat.toLowerCase();
    b.classList.toggle("active", isAll || isMatch);
  });
  renderIssues();
}

/**
 * Renders the filtered issue list.
 */
function renderIssues() {
  const filtered =
    activeFilter === "all"
      ? allIssues
      : allIssues.filter((i) => i.category === activeFilter);
  const el = document.getElementById("issuesList");

  if (!filtered.length) {
    el.innerHTML = '<div class="empty">No issues in this category</div>';
    return;
  }

  el.innerHTML = filtered
    .map(
      (issue) => `
      <div class="issue ${issue.type}">
        <div class="issue-top">
          <span class="issue-title">${issue.title}</span>
          <span class="badge badge-${issue.category}">${issue.category}</span>
        </div>
        ${issue.detail ? `<div class="issue-detail">${issue.detail}</div>` : ""}
        ${issue.selector ? `<div class="issue-selector">${issue.selector}</div>` : ""}
        ${issue.elements?.length ? `
          <div class="issue-code">
            <strong>Elements:</strong><br/>
            ${issue.elements.slice(0, 3).map(e => `<code>${e.replace(/</g, '&lt;')}</code>`).join("<br/>")}
          </div>` : ""}
        ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Remediation Guide</a></div>` : ""}
      </div>
    `,
    )
    .join("");
}

// Kick off the fetch process when DOM is ready
window.addEventListener('DOMContentLoaded', initDashboard);