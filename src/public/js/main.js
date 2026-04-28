/**
 * src/public/js/main.js
 * The Global Portfolio View & Audit Controller
 */

let allPageData = [];
const PI_API_URL = "https://aud-two-strange-cdt.trycloudflare.com/api/audit";

/**
 * src/public/js/main.js
 * Updated initDashboard to display the audit date
 */

async function initDashboard() {
  const status = document.getElementById("status");
  const resultsContainer = document.getElementById("results");
  const dateEl = document.querySelector("header span"); // Targets the span in your header

  try {
    const res = await fetch(`${PI_API_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Pi API is offline");
    
    const data = await res.json();
    allPageData = Array.isArray(data) ? data : [data];

    // Format the date from the first page object
    if (allPageData[0]?.auditedAt) {
      const auditDate = new Date(allPageData[0].auditedAt);
      dateEl.textContent = `Last Audit: ${auditDate.toLocaleString()}`;
    }

    status.textContent = `Global Audit: ${allPageData.length} Pages Scanned`;
    renderPortfolioGrid();
    resultsContainer.style.display = "block";
  } catch (err) {
    status.className = "status error";
    status.textContent = "Bridge Connection Failed.";
    console.error(err);
  }
}

/**
 * Triggered by the "Run Audit" button
 */
async function triggerManualAudit() {
  const runBtn = document.getElementById("runBtn");
  const status = document.getElementById("status");

  runBtn.disabled = true;
  runBtn.textContent = "Processing...";
  
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
  
  // Aggregate Global Stats
  const totalErrors = allPageData.reduce((acc, p) => acc + (p.summary?.errors || 0), 0);
  const totalWarnings = allPageData.reduce((acc, p) => acc + (p.summary?.warnings || 0), 0);

  // Update Header using the restored theme classes
  document.getElementById("numErrors").className = "num red";
  document.getElementById("numErrors").textContent = totalErrors;
  
  document.getElementById("numWarnings").className = "num amber";
  document.getElementById("numWarnings").textContent = totalWarnings;
  
  document.getElementById("numTotal").className = "num";
  document.getElementById("numTotal").textContent = allPageData.length;
  
  document.getElementById("numPassed").className = "num blue";
  document.getElementById("numPassed").textContent = "ALL";

  filtersEl.innerHTML = ""; 
  listEl.className = "page-grid"; 

  listEl.innerHTML = allPageData.map((page, index) => {
    const urlObj = new URL(page.url);
    let displayPath = urlObj.pathname === "/" ? "Home" : urlObj.pathname;
    
    // Shorten path for card display
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
  
  // Update Header for specific page context
  document.getElementById("numErrors").textContent = page.summary?.errors || 0;
  document.getElementById("numWarnings").textContent = page.summary?.warnings || 0;
  document.getElementById("numTotal").textContent = page.summary?.total || 0;
  document.getElementById("numPassed").textContent = "PAGE";

  listEl.className = "issues"; // Use the original 'issues' flex container
  listEl.innerHTML = `
    <button onclick="renderPortfolioGrid()" class="back-btn">← Back to Global Grid</button>
    <h3 style="font-size: 14px; margin-bottom: 12px; color: #666;">Report for: ${page.url}</h3>
    ${page.issues.length > 0 ? page.issues.map(issue => `
      <div class="issue ${issue.type}">
        <div class="issue-top">
          <span class="issue-title">${issue.title}</span>
          <span class="badge badge-${issue.category}">${issue.category}</span>
        </div>
        ${issue.detail ? `<div class="issue-detail">${issue.detail}</div>` : ""}
        ${issue.help ? `<div class="issue-help"><a href="${issue.help}" target="_blank">View Remediation Guide</a></div>` : ""}
      </div>
    `).join("") : '<div class="empty">No issues found on this page.</div>'}
  `;
}

window.addEventListener('DOMContentLoaded', initDashboard);