export function runSeoChecks(snapshot) {
  const issues = [];
  const { title, metaTags, headings, images } = snapshot;

  const getMetaContent = (name) =>
    metaTags.find((m) => m.name === name)?.content;

  // Title checks
  if (!title)
    issues.push({
      type: "error",
      category: "seo",
      title: "Missing page title",
    });
  else if (title.length > 60)
    issues.push({
      type: "error",
      category: "seo",
      title: `Meta title too long (${title.length} chars, max 60)`,
      detail: title,
    });

  // Meta description
  const desc = getMetaContent("description");
  if (!desc)
    issues.push({
      type: "error",
      category: "seo",
      title: "Missing meta description",
    });
  else if (desc.length > 160)
    issues.push({
      type: "warning",
      category: "seo",
      title: `Meta description too long (${desc.length} chars, max 160)`,
    });

  // Canonical
  const canonical = metaTags.find((m) => m.name === "canonical");
  if (!canonical && !snapshot.canonical) {
    issues.push({
      type: "warning",
      category: "seo",
      title: "No canonical link tag found",
    });
  }

  // H1 uniqueness
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0)
    issues.push({ type: "error", category: "seo", title: "No H1 found" });
  if (h1s.length > 1)
    issues.push({
      type: "warning",
      category: "seo",
      title: `Multiple H1 tags found (${h1s.length})`,
      elements: h1s.map((h) => ({ selector: "h1", html: h.html })),
    });

  // Heading hierarchy
  let prevLevel = 0;
  for (const h of headings) {
    if (h.level > prevLevel + 1 && prevLevel !== 0) {
      issues.push({
        type: "warning",
        category: "seo",
        title: `Heading hierarchy skips h${prevLevel} → h${h.level}`,
        elements: [{ selector: `h${h.level}`, html: h.html }],
        detail: `"${h.text}"`,
      });
    }
    prevLevel = h.level;
  }

  // OG tags
  ["og:title", "og:description", "og:image"].forEach((tag) => {
    if (!getMetaContent(tag))
      issues.push({
        type: "warning",
        category: "seo",
        title: `Missing Open Graph tag: ${tag}`,
      });
  });

  return issues;
}
