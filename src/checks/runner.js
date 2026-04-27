import { crawlPage } from "../crawler/playwright.js";
import { runSeoChecks } from "./seo.js";
import { runLayoutChecks } from "./layout.js";
import { runLlmReadinessChecks } from "./llm.js";

export async function runFullAudit(url) {
  // Single browser session — crawl + a11y happen together
  const { snapshot, accessibilityResults } = await crawlPage(url);

  const [seoIssues, layoutIssues, llmIssues] = await Promise.all([
    runSeoChecks(snapshot),
    runLayoutChecks(snapshot),
    runLlmReadinessChecks(snapshot),
  ]);

  const allIssues = [
    ...seoIssues,
    ...layoutIssues,
    ...accessibilityResults,
    ...llmIssues,
  ];

  return {
    url,
    auditedAt: new Date().toISOString(),
    summary: {
      total: allIssues.length,
      errors: allIssues.filter((i) => i.type === "error").length,
      warnings: allIssues.filter((i) => i.type === "warning").length,
    },
    issues: allIssues,
  };
}
