/**
 * src/checks/llm.js
 */
export function runLlmChecks(snapshot) {
  const issues = [];

  // Check for semantic structure
  const semanticTags = ["main", "article", "nav", "footer", "header"];
  const foundTags = semanticTags.filter((tag) => 
    snapshot.html.toLowerCase().includes(`<${tag}`)
  );

  if (foundTags.length < 3) {
    issues.push({
      type: "warning",
      category: "llm",
      rule: "low-semantic-density",
      title: "Low Semantic Density",
      detail: "The page lacks standard HTML5 semantic elements (main, article, etc.), making it harder for LLMs/AI to parse content structure.",
    });
  }

  // Check for JSON-LD
  if (!snapshot.structuredData || snapshot.structuredData.length === 0) {
    issues.push({
      type: "warning",
      category: "llm",
      rule: "missing-structured-data",
      title: "Missing Structured Data (JSON-LD)",
      detail: "No JSON-LD structured data found. Structured data is critical for AI agents and search engines to understand the page's intent.",
    });
  }

  return issues;
}
