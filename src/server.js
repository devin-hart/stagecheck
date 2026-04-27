import express from "express";
import { runFullAudit } from "./checks/runner.js";
import { fileURLToPath } from "url"; // ADD THIS
import path from "path"; // ADD THIS

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ADD THIS
const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "public"))); // ADD THIS

app.post("/audit", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    const report = await runFullAudit(url);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("stagecheck running on :3000"));
