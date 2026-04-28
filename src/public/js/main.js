/**
 * src/public/js/main.js
 * The Global Portfolio View & Audit Controller
 */

let allPageData = [];
const PI_API_URL = "https://aud-two-strange-cdt.trycloudflare.com/api/audit";

/**
 * Main Initialization: Runs on page load to fetch the latest stored data
 */
async function initDashboard() {
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");

  try {
    // Cache busting prevents the 304 "Not Modified" loop
    const res = await fetch(`${PI_API_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Pi API is offline");
    
    const data = await res.json();
    
    // Ensure data is treated as an array of page objects
    allPageData = Array.isArray(data) ? data : [data];

    status.textContent = `Global Audit: ${allPageData.length} Pages Scanned`;
    renderPortfolioGrid();
    resultsContainer.style.display = "block";
  } catch (err) {
    status.className = "status error";
    status.textContent = "Bridge Connection Failed: Check your Cloudflare Tunnel.";
    console.error(err);
  }
}

/**
 * Triggered by the "Run Audit" button
 */
async function triggerManualAudit() {
  const url = document.getElementById("urlInput").value;
  const status = document.getElementById("status");
  const runBtn = document.getElementById("runBtn");

  // UI Feedback
  runBtn.disabled = true;
  runBtn.textContent = "Processing...";
  status.textContent = `Refreshing audit data for ${url}...`;

  // Currently, the Pi serves the 'last_audit.json'. 
  // This call refreshes the UI with the most recent scan available.
  await initDashboard();

  runBtn.disabled = false;
  runBtn.textContent = "Run audit";
}

/**
 * TIER 1: The Bird's Eye View (Grid of Pages)
 */
function renderPortfolioGrid() {
  const listEl = document.getElementById("issuesList");
  const filtersEl = document.getElementById("filters");
  
  // Aggregate Global Stats for the top cards
  const totalErrors = allPageData.reduce((acc, p) => acc + (p.summary?.errors || 0), 0);
  const totalWarnings = allPageData.reduce((acc, p) => acc + (p.summary?.warnings || 0), 0);

  document.getElementById("numErrors").textContent = totalErrors;
  document.getElementById("numWarnings").textContent = totalWarnings;
  document.getElementById("numTotal").textContent = allPageData.length;
  document.getElementById("numPassed").textContent = "GLOBAL";

  filtersEl.innerHTML = ""; // Filters hidden in Portfolio View
  listEl.className = "page-grid"; 

  listEl.innerHTML = allPageData.map((page, index) => {
    const urlObj = new URL(page.url);
    
    // UI URL Shortening: Show path or Home
    let displayPath = urlObj.pathname === "/" ? "Home" : urlObj.pathname;
    
    // If path is too long, show the last segment and clean hyphens
    if (displayPath.length > 30) {
        displayPath = "..." + displayPath.split('/').filter(Boolean).pop().replace(/-/g, ' ');
    }
    
    const errorCount = page.summary?.errors || 0;

    return `
      <div class="page-card" onclick="viewPageReport(${index})">
        <div class="page-score ${errorCount > 0 ? 'bad' : 'good'}">
          ${errorCount}
        </div>
        <div class="page-info">
          <span class="page-url">${displayPath}</span>
          <span class="page-meta">${page.summary?.total || 0} Issues Found</span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * TIER 2: Drill-down into a specific URL report
 */
function viewPageReport(index) {
  const page = allPageData[index];
  const listEl = document.getElementById("issuesList");
  
  // Update Top Stats for this specific page context
  document.getElementById("numErrors").textContent = page.summary?.errors || 0;
  document.getElementById("numWarnings").textContent = page.summary?.warnings || 0;
  document.getElementById("numTotal").textContent = page.summary?.total || 0;
  document.getElementById("numPassed").textContent = "DETAIL";

  listEl.className = "issues-list";
  listEl.innerHTML = `
    <button onclick="renderPortfolioGrid()" class="back-btn">← Back to Global Grid</button>
    <h3 style="margin-bottom: 20px;">Report for: ${page.url}</h3>
    ${page.issues.length > 0 ? page.issues.map(issue => `
      <div class="issue ${issue.type}">
        <div class="issue-top">
          <span class="issue-title">${issue.title}</span>
          <span class="badge badge-${issue.category}">${issue.category}</span>
        </div>
        ${issue.detail ? `<div class="issue-detail">${issue.detail}</div>` : ""}
        ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Remediation Guide</a></div>` : ""}
      </div>
    `).join("") : '<div class="stat-card">No issues found on this page.</div>'}
  `;
}

// Initial fetch when DOM is ready
window.addEventListener('DOMContentLoaded', initDashboard);