
# SkillFit AI Backend

This is the core logic engine of SkillFit AI, built with **FastAPI**.

It handles:
1.  **Resume Parsing**: Converting PDF to structured JSON content.
2.  **Job Search Orchestration**: Triggering scrapers (LinkedIn, Indeed, etc.).
3.  **Vector Embeddings**: Using `sentence-transformers` to embed resumes and job descriptions.
4.  **GenAI Features**: Integrating with Groq (Llama-3) to generate career advice.
5.  **Database**: Managing user profiles and job history in SQLite (with vector search).

## 🚀 Key Technologies

*   **FastAPI**: High-performance async web framework.
*   **Pydantic**: Data validation.
*   **Playwright**: Browser automation for scraping.
*   **Spacy**: Named Entity Recognition (NER) for skill extraction.
*   **LangChain**: Prompt engineering for AI features.
*   **SQLite-Vec**: Fast vector similarity search.

## 📂 Folder Structure

*   `app/`: Main application code.
    *   `api/`: API Routers and Endpoints (`/profile`, `/jobs`, `/genai`).
    *   `core/`: Configuration settings (`config.py`).
    *   `db/`: Database models and CRUD operations.
    *   `models/`: Pydantic schemas.
    *   `services/`: Business logic (Scraper Engine, Vector Service, GenAI Service).

## 🔗 Key Endpoints

### Profile
*   `POST /api/v1/profile/upload`: Upload and parse resume PDF.
*   `POST /api/v1/profile/embed`: Confirm skills and generate vector embedding.

### Jobs
*   `POST /api/v1/jobs/search`: Initiate a multi-portal job search (async task).
*   `GET /api/v1/jobs/status/{task_id}`: Check scraping progress.
*   `GET /api/v1/jobs/results/{task_id}`: Retrieve aggregated job listings.
*   `POST /api/v1/jobs/compare`: Deep-dive comparison between resume & job description.

### GenAI
*   `POST /api/v1/genai/suggest-roles`: AI-suggested career paths.
*   `POST /api/v1/genai/roadmap`: Generate a 3-month learning plan.

## 🛠️ Development

Run the backend server locally:

```bash
uvicorn backend.app.main:app --reload --port 8000
```
