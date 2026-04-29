/**
 * Evaluates Core Web Vitals against Google's official thresholds.
 *
 * LCP (Largest Contentful Paint) — measures loading performance
 *   Good:         < 2500ms
 *   Needs Work:   2500ms – 4000ms
 *   Poor:         > 4000ms
 *
 * CLS (Cumulative Layout Shift) — measures visual stability
 *   Good:         < 0.1
 *   Needs Work:   0.1 – 0.25
 *   Poor:         > 0.25
 */
export function runPerformanceChecks(vitals) {
  const issues = [];
  const { lcp, cls } = vitals;

  console.log(`[Perf Check] Evaluating: LCP=${lcp}ms, CLS=${cls}`);

  // --- LCP ---
  if (lcp > 4000) {
    issues.push({
      type: "error",
      category: "performance",
      title: `LCP is poor (${lcp}ms)`,
      detail: `Largest Contentful Paint took ${lcp}ms. Google's threshold for a good experience is under 2500ms. This likely means images or server response times are too slow.`,
    });
  } else if (lcp > 2500) {
    issues.push({
      type: "warning",
      category: "performance",
      title: `LCP needs improvement (${lcp}ms)`,
      detail: `Largest Contentful Paint took ${lcp}ms. Aim for under 2500ms. Consider optimizing hero images, reducing render-blocking resources, or improving server response time.`,
    });
  }

  // --- CLS ---
  if (cls > 0.25) {
    issues.push({
      type: "error",
      category: "performance",
      title: `CLS is poor (score: ${cls})`,
      detail: `Cumulative Layout Shift score of ${cls} indicates severe visual instability. Elements are shifting significantly after initial render. Check for images without dimensions, dynamic content injection, or late-loading fonts.`,
    });
  } else if (cls > 0.1) {
    issues.push({
      type: "warning",
      category: "performance",
      title: `CLS needs improvement (score: ${cls})`,
      detail: `Cumulative Layout Shift score of ${cls} means some elements are shifting after load. Aim for under 0.1. Add explicit width/height to images and avoid inserting content above existing content.`,
    });
  }

  return issues;
}
