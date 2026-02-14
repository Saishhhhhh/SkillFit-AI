
# SkillFit AI - The Scraper Engine

A high-performance, asynchronous orchestration of job scrapers for multi-platform intelligence.
Located in `scraper/`.

## 🚀 Key Features

*   **Multi-Platform Aggregation**: Scrapes **LinkedIn, Indeed, Glassdoor**, and **Naukri**.
*   **Intelligent Parsing**:
    *   Unlike simple HTML parsers, it uses **dynamic selectors** that evolve (DOM-based).
    *   **Fallback Strategies**: Tries multiple scraping methods (LD+JSON, Meta Tags, Visible Text) to ensure data capture.
*   **Anti-Bot Resilience**: Uses `playwright` (stealth browser automation) + `fake-useragent` rotation to minimize blocks.
*   **Unified Schema**: Regardless of the source, every job is returned as a standardized JSON object.

## 🛠️ The Architecture

1.  **Orchestrator**: The backend task runner (`backend.app.services.scraper_engine.py`) spins up individual threads for requested portals.
2.  **Workers**: Each scraper script (`linkedin.py`, `Indeed.py`, etc.) runs independently, logging progress to a local file.
3.  **Aggregator**: Once all threads complete, the results are merged into a single `results.json` and passed to the ML engine for scoring.

## 📦 Scrapers Included

### LinkedIn (`linkedin.py`)
*   **Method**: Specialized `requests` + `BeautifulSoup`.
*   **Wait Strategy**: Exponential backoff on 429 errors.
*   **Data**: Title, Company, Location, Description (Full Text).

### Glassdoor (`Glassdoor.py`)
*   **Method**: `Playwright` (Headless Browser).
*   **Why**: Glassdoor uses highly dynamic JavaScript rendering and Cloudflare protection.
*   **Output**: Cleaned HTML description.

### Indeed (`Indeed.py`)
*   **Method**: `requests` (Session-based) + `BeautifulSoup`.
*   **Details**: Handles pagination and extracts hidden JSON data from `window.mosaic`.

### Naukri (`Naukri.py`)
*   **Method**: `Playwright` (Headless Browser).
*   **Why**: Requires JS execution for accurate skill tags.
*   **Output**: Direct skill tags from the DOM (highly accurate).

## ⚠️ Requirements

Running these requires the Playwright browser binaries:

```bash
playwright install
```
