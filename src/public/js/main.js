/**
 * src/public/js/main.js
 * The Global Portfolio View
 */

let allPageData = [];
const PI_API_URL = "https://aud-two-strange-cdt.trycloudflare.com/api/audit";

/**
 * Main Initialization
 */
async function initDashboard() {
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");

  try {
    const res = await fetch(`${PI_API_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Pi API is offline");
    
    const data = await res.json();
    allPageData = Array.isArray(data) ? data : [data];

    status.textContent = `Global Audit: ${allPageData.length} Pages Scanned`;
    renderPortfolioGrid();
    resultsContainer.style.display = "block";
  } catch (err) {
    status.className = "status error";
    status.textContent = "Bridge Connection Failed: Ensure the Pi is active.";
  }
}

/**
 * TIER 1: The Grid of Pages (Portfolio View)
 */
function renderPortfolioGrid() {
  const listEl = document.getElementById("issuesList");
  const filtersEl = document.getElementById("filters");
  
  // Update Header for Global context
  document.getElementById("numErrors").textContent = allPageData.reduce((acc, p) => acc + p.summary.errors, 0);
  document.getElementById("numWarnings").textContent = allPageData.reduce((acc, p) => acc + p.summary.warnings, 0);
  document.getElementById("numTotal").textContent = allPageData.length;
  document.getElementById("numPassed").textContent = "GLOBAL";

  filtersEl.innerHTML = ""; 
  listEl.className = "page-grid"; 

  listEl.innerHTML = allPageData.map((page, index) => {
    const urlObj = new URL(page.url);
    
    // Clean up long URLs for the card display
    let displayPath = urlObj.pathname === "/" ? "Home" : urlObj.pathname;
    if (displayPath.length > 30) {
        displayPath = "..." + displayPath.split('/').pop().replace(/-/g, ' ');
    }
    
    return `
      <div class="page-card" onclick="viewPageReport(${index})">
        <div class="page-score ${page.summary.errors > 0 ? 'bad' : 'good'}">
          ${page.summary.errors}
        </div>
        <div class="page-info">
          <span class="page-url">${displayPath}</span>
          <span class="page-meta">${page.summary.total} Issues Found</span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * TIER 2: Drill-down into a specific URL
 */
function viewPageReport(index) {
  const page = allPageData[index];
  const listEl = document.getElementById("issuesList");
  
  // Update Top Stats for this specific page
  document.getElementById("numErrors").textContent = page.summary.errors;
  document.getElementById("numWarnings").textContent = page.summary.warnings;
  document.getElementById("numTotal").textContent = page.summary.total;
  document.getElementById("numPassed").textContent = "DETAIL";

  listEl.className = "issues-list";
  listEl.innerHTML = `
    <button onclick="renderPortfolioGrid()" class="back-btn">← Back to Global Grid</button>
    <h3 style="margin: 10px 0 20px 0;">Report for: ${page.url}</h3>
    ${page.issues.map(issue => `
      <div class="issue ${issue.type}">
        <div class="issue-top">
          <span class="issue-title">${issue.title}</span>
          <span class="badge badge-${issue.category}">${issue.category}</span>
        </div>
        ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Remediation Guide</a></div>` : ""}
      </div>
    `).join("")}
  `;
}

window.addEventListener('DOMContentLoaded', initDashboard);