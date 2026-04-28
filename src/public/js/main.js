let allPageData = [];

const PI_API_URL = "https://your-public-tunnel-url.com/api/audit";

async function initDashboard() {
  const status = document.getElementById("status");
  try {
    const res = await fetch(`${PI_API_URL}?t=${Date.now()}`);
    const data = await res.json();
    
    // Save the full array of scanned pages
    allPageData = Array.isArray(data) ? data : [data];
    
    status.textContent = `Global Audit: ${allPageData.length} Pages Scanned`;
    renderPageGrid();
  } catch (err) {
    status.textContent = "Bridge Connection Failed.";
  }
}

/**
 * Tier 1: The Grid of Pages
 */
function renderPageGrid() {
  const container = document.getElementById("issuesList");
  // We repurpose the issuesList area for the page grid
  container.className = "page-grid"; 
  
  container.innerHTML = allPageData.map((page, index) => `
    <div class="page-card" onclick="viewPageReport(${index})">
      <div class="page-score ${page.summary.errors > 0 ? 'bad' : 'good'}">
        ${page.summary.errors}
      </div>
      <div class="page-info">
        <span class="page-url">${new URL(page.url).pathname}</span>
        <span class="page-meta">${page.summary.total} Issues Found</span>
      </div>
    </div>
  `).join("");
}

/**
 * Tier 2: The Specific Page Report
 */
function viewPageReport(index) {
  const page = allPageData[index];
  const container = document.getElementById("issuesList");
  
  // Show the stats for THIS page in the top grid
  document.getElementById("numErrors").textContent = page.summary.errors;
  document.getElementById("numWarnings").textContent = page.summary.warnings;
  document.getElementById("numTotal").textContent = page.summary.total;
  document.getElementById("numPassed").textContent = "DETAIL";

  // Render the issues for just this page
  container.className = "issues-list";
  container.innerHTML = `
    <button onclick="renderPageGrid()" class="back-btn">← Back to Global Grid</button>
    <h3>Report for: ${page.url}</h3>
    ${page.issues.map(issue => `
      <div class="issue ${issue.type}">
        <div class="issue-top">
          <span class="issue-title">${issue.title}</span>
          <span class="badge badge-${issue.category}">${issue.category}</span>
        </div>
        ${issue.help ? `<a href="${issue.help}" target="_blank">Remediation Guide</a>` : ""}
      </div>
    `).join("")}
  `;
}

window.addEventListener('DOMContentLoaded', initDashboard);