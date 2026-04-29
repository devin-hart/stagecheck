/**
 * src/checks/layout.js
 */
export function runLayoutChecks(snapshot) {
  const issues = [];

  if (snapshot.overflowingElements && snapshot.overflowingElements.length > 0) {
    snapshot.overflowingElements.forEach((el) => {
      if (!el.isHidden) {
        issues.push({
          type: "error",
          category: "layout",
          rule: "horizontal-overflow",
          title: "Horizontal Overflow Detected",
          detail: `Element ${el.selector} is ${el.scrollWidth}px wide, which exceeds the viewport width of ${snapshot.viewportWidth}px.`,
          selector: el.selector,
          html: el.html
        });
      }
    });
  }

  return issues;
}
