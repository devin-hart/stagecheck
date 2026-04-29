import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { runSeoChecks } from "./checks/seo.js";
import { runLayoutChecks } from "./checks/layout.js";
import { runLlmChecks } from "./checks/llm.js";
import { runPerformanceChecks } from "./checks/performance.js";
import { runLinkChecks } from "./checks/links.js";
import { captureSnapshot, getCoreWebVitals } from "./snapshot.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEVICES = {
  desktop: {
    name: "Desktop",
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  tablet: {
    name: "Tablet",
    viewport: { width: 820, height: 1180 },
    userAgent: "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  },
  mobile: {
    name: "Mobile",
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  },
};

/**
 * Optimized manual audit for dashboard. Matches bridge logic.
 */
export async function auditPage(url, { browser, context, deviceType = "desktop", globalIssues = [], linkCache = {}, onProgress = null } = {}) {
  const page = await context.newPage();
  
  try {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2000);

    let sharedIssues = [];
    
    // Global checks run once per page (on desktop)
    if (deviceType === "desktop" && globalIssues.length === 0) {
      if (onProgress) onProgress("Scanning Accessibility...");
      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "best-practice"])
        .analyze();

      const accessibilityIssues = axeResults.violations.map((v) => ({
        type: "error",
        category: "accessibility",
        rule: v.id,
        title: v.description,
        impact: v.impact,
        elements: v.nodes.map((n) => n.target.join(" > ")),
        help: v.helpUrl,
      }));

      if (onProgress) onProgress("Checking for Broken Links...");
      const snapshotForLinks = await page.evaluate(captureSnapshot);
      const brokenLinkIssues = await runLinkChecks(snapshotForLinks, linkCache);

      sharedIssues = [...accessibilityIssues, ...brokenLinkIssues];
    } else {
      sharedIssues = globalIssues;
    }

    if (onProgress) onProgress(`Finalizing ${deviceType} report...`);
    const snapshot = await page.evaluate(captureSnapshot);
    const deviceSpecificIssues = [
      ...runSeoChecks(snapshot),
      ...runLlmChecks(snapshot),
      ...runLayoutChecks(snapshot),
    ];

    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 50 });
    const screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString("base64")}`;

    const vitals = await getCoreWebVitals(page);
    const allIssues = [
      ...sharedIssues,
      ...deviceSpecificIssues,
      ...runPerformanceChecks(vitals),
    ];

    return {
      auditedAt: new Date().toISOString(),
      loadTime: `${Date.now() - startTime}ms`,
      screenshot: screenshotBase64,
      resources: { lcp: `${vitals.lcp}ms`, cls: vitals.cls },
      summary: {
        total: allIssues.length,
        errors: allIssues.filter((i) => i.type === "error").length,
        warnings: allIssues.filter((i) => i.type === "warning").length,
      },
      issues: allIssues,
      sharedIssuesResults: deviceType === "desktop" ? sharedIssues : [] 
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Main Orchestrator for Manual/Local Audits with Progress Reporting.
 */
export async function runFullAudit(singleUrl = null, onProgress = null) {
  const queue = singleUrl ? [singleUrl] : ["https://corporate.comcast.com/"]; 
  const results = [];
  const globalLinkCache = {};
  const deviceTypes = ["desktop", "tablet", "mobile"];

  const browser = await chromium.launch({
    channel: "chrome", // Use your real installed Chrome
    headless: true,    // Run in background
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const [urlIndex, url] of queue.entries()) {
      const pageResult = { url, devices: {} };
      let pageGlobalIssues = [];

      for (const deviceType of deviceTypes) {
        if (onProgress) onProgress(`Auditing ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}...`);
        const context = await browser.newContext({ ...DEVICES[deviceType] });
        
        try {
          const report = await auditPage(url, { 
            browser, 
            context, 
            deviceType,
            globalIssues: pageGlobalIssues,
            linkCache: globalLinkCache,
            onProgress
          });

          if (deviceType === "desktop") {
            pageGlobalIssues = report.sharedIssuesResults;
          }

          pageResult.devices[deviceType] = report;
        } finally {
          await context.close().catch(() => {});
        }
      }
      results.push(pageResult);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return singleUrl ? results[0] : results;
}
