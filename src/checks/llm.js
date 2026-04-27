export async function runLlmReadinessChecks(snapshot) {
  const issues = [];
  const { structuredData, headings, html, metaTags } = snapshot;

  // 1. Structured data
  if (!structuredData.length) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: "No JSON-LD structured data found",
      detail:
        "Add schema.org markup (Organization, WebPage, Article…) so LLMs and crawlers can extract structured facts.",
    });
  }

  // 2. Semantic HTML5 elements
  const hasSemanticTags =
    /<(article|section|main|nav|aside|header|footer)/i.test(html);
  if (!hasSemanticTags) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: "No semantic HTML5 elements detected",
      detail:
        "Use <main>, <article>, <section>, <nav> etc. instead of generic <div> wrappers.",
    });
  }

  // 3. Heading clarity — headings that are too short to be meaningful
  const vagueHeadings = headings.filter((h) => h.text.split(" ").length < 2);
  if (vagueHeadings.length) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: `${vagueHeadings.length} heading(s) too vague for LLM parsing`,
      detail: `Single-word headings like "${vagueHeadings[0].text}" give no context. Use descriptive phrases.`,
    });
  }

  // 4. Missing meta description (LLMs use this for page summarization)
  const desc = metaTags.find((m) => m.name === "description")?.content;
  if (!desc) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: "No meta description — LLMs lack a page summary",
    });
  }

  // 5. No lang attribute on <html>
  const hasLang = /html[^>]+lang=/i.test(html);
  if (!hasLang) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: "Missing lang attribute on <html>",
      detail:
        "Language declaration helps LLMs and screen readers process content correctly.",
    });
  }

  // 6. No <main> landmark
  if (!/<main[\s>]/i.test(html)) {
    issues.push({
      type: "warning",
      category: "llm-ready",
      title: "No <main> landmark element found",
      detail:
        "LLMs and crawlers use <main> to identify primary content vs chrome.",
    });
  }

  return issues;
}
