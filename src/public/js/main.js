/**
 * src/public/js/main.js
 * The StageCheck Frontend Engine
 */

let allIssues = [];
let activeFilter = "all";

// Replace with your Cloudflare Tunnel URL
const PI_API_URL = "https://your-public-tunnel-url.com/api/audit";

async function initDashboard() {
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");

  try {
    const res = await fetch(PI_API_URL);
    if (!res.ok) throw new Error("Pi API is offline");
    
    const data = await res.json();
    // Support both single objects or arrays from the Pi
    const latestAudit = Array.isArray(data) ? data[0] : data;

    status.textContent = `Latest Audit: ${new Date(latestAudit.auditedAt).toLocaleString()}`;
    renderResults(latestAudit);
    resultsContainer.style.display = "block";
  } catch (err) {
    status.className = "status error";
    status.textContent = "Bridge Connection Failed: Check your Cloudflare Tunnel.";
  }
}

function renderResults(data) {
  allIssues = data.issues || [];
  
  // Update Stats Grid
  document.getElementById("numErrors").textContent = data.summary?.errors || 0;
  document.getElementById("numWarnings").textContent = data.summary?.warnings || 0;
  document.getElementById("numTotal").textContent = data.summary?.total || 0;
  
  // Logic for 'Passed' criteria (Optional)
  const passed = data.summary?.total > 0 ? "PASSED" : "—";
  document.getElementById("numPassed").textContent = passed;

  // Build Dynamic Filter Buttons
  const categories = ["all", ...new Set(allIssues.map(i => i.category))];
  const filtersEl = document.getElementById("filters");
  
  filtersEl.innerHTML = categories.map(c => `
    <button class="filter-btn ${c === activeFilter ? 'active' : ''}" 
            onclick="setFilter('${c}')">
      ${c.toUpperCase()}
    </button>
  `).join("");

  renderIssues();
}

function setFilter(cat) {
  activeFilter = cat;
  renderResults({ issues: allIssues, summary: calculateSummary(allIssues) });
}

function renderIssues() {
  const el = document.getElementById("issuesList");
  const filtered = activeFilter === "all" 
    ? allIssues 
    : allIssues.filter(i => i.category === activeFilter);

  if (filtered.length === 0) {
    el.innerHTML = '<div class="stat-card">No issues found in this category.</div>';
    return;
  }

  el.innerHTML = filtered.map(issue => `
    <div class="issue ${issue.type}">
      <div class="issue-top">
        <span class="issue-title">${issue.title}</span>
        <span class="badge badge-${issue.category}">${issue.category}</span>
      </div>
      ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Remediation Guide</a></div>` : ""}
    </div>
  `).join("");
}

// Helper to keep summary updated during filtering
function calculateSummary(issues) {
  return {
    errors: issues.filter(i => i.type === 'error').length,
    warnings: issues.filter(i => i.type === 'warning').length,
    total: issues.length
  };
}

window.addEventListener('DOMContentLoaded', initDashboard);