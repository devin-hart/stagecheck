let allIssues = [];
let activeFilter = "all";

async function runAudit() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) return;

  const btn = document.getElementById("runBtn");
  const status = document.getElementById("status");

  btn.disabled = true;
  btn.textContent = "Auditing…";
  status.className = "status running";
  status.textContent =
    "Crawling page and running checks… this takes 10–20 seconds.";
  document.getElementById("results").style.display = "none";

  try {
    const res = await fetch("/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Audit failed");

    status.className = "status";
    status.textContent = `Audit complete — ${data.issues.length} issues found.`;
    renderResults(data);
  } catch (err) {
    status.className = "status error";
    status.textContent = "Error: " + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Run audit";
  }
}

function renderResults(data) {
  allIssues = data.issues;
  activeFilter = "all";

  document.getElementById("numErrors").textContent = data.summary.errors;
  document.getElementById("numWarnings").textContent = data.summary.warnings;
  document.getElementById("numTotal").textContent = data.summary.total;
  document.getElementById("numPassed").textContent = "—";

  const categories = ["all", ...new Set(allIssues.map((i) => i.category))];
  const filtersEl = document.getElementById("filters");
  filtersEl.innerHTML = categories
    .map(
      (c) => `
      <button class="filter-btn ${c === "all" ? "active" : ""}" onclick="setFilter('${c}')">${c === "all" ? "All issues" : c}</button>
    `,
    )
    .join("");

  renderIssues();
  document.getElementById("results").style.display = "block";
}

function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle(
      "active",
      b.textContent === cat ||
        (cat === "all" && b.textContent === "All issues"),
    );
  });
  renderIssues();
}

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
        ${issue.elements?.length ? `<div class="issue-code">${issue.elements.slice(0, 3).join("\n")}</div>` : ""}
      </div>
    `,
    )
    .join("");
}

document.getElementById("urlInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runAudit();
});
