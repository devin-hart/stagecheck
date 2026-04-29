# StageCheck

StageCheck is a high-performance web auditing tool designed for staging environments. it provides a comprehensive breakdown of a website's health across multiple device viewports, ensuring that your pages are optimized for users, search engines, and AI agents.

## 🚀 Key Features

- **Multi-Device Auditing**: Every scan automatically evaluates your page across **Desktop**, **Tablet**, and **Mobile** breakpoints.
- **Real-Time Progress Streaming**: Built on Server-Sent Events (SSE), providing live feedback ("Scanning Accessibility...", "Checking Links...") as the audit progresses.
- **Core Audit Pillars**:
  - **SEO & Metadata**: Validates titles, descriptions, canonicals, and social tags.
  - **Accessibility**: Deep-scan using Axe-core for WCAG 2.1 compliance.
  - **Visual Layout**: Detects horizontal overflow, layout shifts, and responsive breaks.
  - **LLM-Readiness**: Analyzes semantic HTML density and structured data (JSON-LD) to ensure your site is readable by AI agents.
- **Zero-Disk Architecture**: Optimized for Raspberry Pi and low-I/O environments using Base64 memory-resident screenshots.
- **Premium Dashboard**: A sleek, dark-mode-first interface with 4-column grid layouts, skeleton loading, and stakeholder-ready PDF exports.

## 🛠️ Architecture

StageCheck is split into two primary components:

1.  **The Runner (`src/runner.js`)**: The core engine powered by Playwright. It orchestrates the browser instances, manages the link cache, and executes the multi-device audit loop.
2.  **The Dashboard Server (`src/server.js`)**: An Express-based API that serves the dashboard frontend and provides the streaming audit endpoints.

## 🏃 Getting Started

### Prerequisites
- Node.js (v18+)
- Playwright dependencies (Chromium)

### Installation
```bash
npm install
```

### Running the Dashboard
```bash
# Start the local dashboard and API
node src/server.js
```
The dashboard will be available at `http://localhost:5000`.

### Running a CLI Audit
```bash
# Run a full site discovery scan from the terminal
node src/runner.js
```

## 📂 Project Structure

- `src/public/`: Dashboard frontend (HTML, CSS, JS).
- `src/checks/`: Specialized logic for SEO, Layout, LLM, and Performance.
- `src/runner.js`: Main audit orchestrator and browser controller.
- `src/server.js`: Express server and streaming API.
- `src/snapshot.js`: Browser-side script for DOM data extraction.

## 📊 Security
All API endpoints are protected by `x-api-key` validation. Ensure your `.env` file contains a valid `AUDIT_API_KEY`.

---
*Built for high-performance staging audits.*
