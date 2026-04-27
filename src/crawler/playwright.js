import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

export async function crawlPage(url) {
  const browser = await chromium.launch({
    headless: false, // CHANGE true → false
    channel: "chrome", // ADD THIS — uses your real installed Chrome
  });

  const context = await browser.newContext({
    // Impersonate a real Chrome browser
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    // Accept all languages and content types like a real browser
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
    },
    // Mask headless signals
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    // Accessibility audit
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();

    const accessibilityResults = axeResults.violations.map((v) => ({
      type: "error",
      category: "accessibility",
      rule: v.id,
      title: v.description,
      impact: v.impact,
      elements: v.nodes.map((n) => n.target.join(" > ")),
      help: v.helpUrl,
    }));

    // DOM snapshot
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
        null,
      metaTags: [...document.querySelectorAll("meta")].map((m) => ({
        name: m.getAttribute("name") || m.getAttribute("property"),
        content: m.getAttribute("content"),
      })),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
        (h) => ({
          level: parseInt(h.tagName[1]),
          text: h.innerText.trim(),
        }),
      ),
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
      overflowingElements: [...document.querySelectorAll("*")]
        .filter((el) => el.scrollWidth > document.body.clientWidth)
        .map((el) => ({
          selector:
            el.tagName.toLowerCase() +
            (el.id ? "#" + el.id : "") +
            (el.className ? "." + [...el.classList].join(".") : ""),
          scrollWidth: el.scrollWidth,
        }))
        .slice(0, 20),
      structuredData: [
        ...document.querySelectorAll('script[type="application/ld+json"]'),
      ]
        .map((s) => {
          try {
            return JSON.parse(s.innerText);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
      html: document.documentElement.outerHTML,
    }));

    return { url, snapshot, accessibilityResults };
  } finally {
    await browser.close();
  }
}
