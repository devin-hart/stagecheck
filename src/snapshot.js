/**
 * src/snapshot.js
 * Identical to Automation Bridge version.
 */
export function captureSnapshot() {
  const bodyWidth = document.body.clientWidth;

  return {
    title: document.title,
    html: document.documentElement.outerHTML,
    textToHtmlRatio: (
      document.body.innerText.length /
      document.documentElement.innerHTML.length
    ).toFixed(4),
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      level: parseInt(h.tagName[1]),
      text: h.innerText.trim(),
      html: h.outerHTML,
    })),
    metaTags: [...document.querySelectorAll("meta")].map((m) => ({
      name: m.getAttribute("name") || m.getAttribute("property"),
      content: m.getAttribute("content"),
    })),
    images: [...document.querySelectorAll("img")].map((i) => ({
      src: i.src,
      alt: i.getAttribute("alt"),
      loading: i.getAttribute("loading"),
    })),
    links: [...document.querySelectorAll("a")].map((a) => ({
      href: a.href,
      text: a.innerText.trim(),
    })),
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    lang: document.documentElement.getAttribute("lang") || null,
    structuredData: [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ]
      .map((s) => {
        try {
          return JSON.parse(s.innerText);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean),
    overflowingElements: (() => {
      return [
        ...document.querySelectorAll(
          "div, section, main, article, footer, header, nav, form, table"
        ),
      ]
        .filter((el) => el.scrollWidth > bodyWidth)
        .map((el) => {
          const style = window.getComputedStyle(el);
          return {
            selector:
              el.tagName.toLowerCase() +
              (el.id ? "#" + el.id : "") +
              (el.className ? "." + [...el.classList].join(".") : ""),
            scrollWidth: el.scrollWidth,
            height: el.offsetHeight,
            isHidden: style.display === "none" || style.visibility === "hidden",
            html: el.outerHTML,
          };
        })
        .slice(0, 20);
    })(),
  };
}

export async function getCoreWebVitals(page) {
  return await page.evaluate(async () => {
    let lcp = 0;
    let cls = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) lcp = entries[entries.length - 1].startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });

    await new Promise((r) => setTimeout(r, 1000));
    return { lcp: Math.round(lcp), cls: parseFloat(cls.toFixed(4)) };
  });
}
