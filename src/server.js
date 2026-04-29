import express from "express";
import { runFullAudit } from "./runner.js"; // Fixed Import
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// --- Security Helpers ---

function isUrlSafe(urlString) {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    const isInternal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.endsWith(".local");
    return !isInternal;
  } catch { return false; }
}

const API_KEY = "stagecheck_9f3b2a7c8d";

function checkApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key; // Support key in query for SSE
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.use(express.static(path.join(__dirname, "public")));

// GET: Fetch last audit results
app.get("/api/audit", checkApiKey, (req, res) => {
  const outputPath = path.join(__dirname, "data", "last_audit.json");
  if (fs.existsSync(outputPath)) {
    const data = fs.readFileSync(outputPath, "utf8");
    res.json(JSON.parse(data));
  } else {
    res.json([]);
  }
});

/**
 * STREAMING Manual Audit (SSE)
 * Sends real-time progress updates to the frontend.
 */
app.get("/api/manual-audit-stream", checkApiKey, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).write("data: Error: URL required\n\n");

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const sendStatus = (message) => {
    res.write(`data: ${JSON.stringify({ status: message })}\n\n`);
  };

  try {
    sendStatus(`Starting audit for ${url}...`);
    
    // Pass a progress callback to the runner
    const report = await runFullAudit(url, (msg) => {
      sendStatus(msg);
    });

    // Send final report
    res.write(`data: ${JSON.stringify({ result: report })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(5000, () => console.log("[START] Dashboard Server on :5000"));
