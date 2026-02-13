# SkillFit-AI

SkillFit AI is an AI-powered job matching platform that analyzes a candidate’s resume (or skills) and matches it against real job listings to determine how well they fit a role.

## 🚀 Features

-   **Multi-Platform Scraping**: Fetches jobs from LinkedIn, Indeed, Glassdoor, Naukri, and Google Jobs.
-   **Async Orchestration**: Runs multiple scrapers in parallel in the background.
-   **RESTful API**: Clean FastAPI endpoints to manage search tasks.
-   **Swagger UI**: Interactive testing interface.

## 🛠️ Installation & Setup

### 1. Prerequisites

-   Python 3.8 or higher
-   Pip (Python Package Manager)

### 2. Install Dependencies

Clone the repo and install the required packages:

```bash
pip install -r requirements.txt
playwright install
```

### 3. Start the Server

Run the backend server using Uvicorn:

```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server is now live at `http://127.0.0.1:8000`.

---

## 📖 API Usage Guide

The API is designed to be asynchronous. You start a search task, get a Task ID, and then poll for the status until it's complete.

### Interactive Documentation

Visit **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** for the Swagger UI, where you can test endpoints directly in your browser.

### 🔄 Workflow

#### Step 1: Initiate a Search

**Endpoint**: `POST /api/v1/jobs/search`

Send a request to start the scraping engine. You can choose which portals to scrape.

**Payload**:
```json
{
  "query": "Full Stack Developer",
  "location": "Remote",
  "portals": [
    "linkedin",
    "indeed"
  ],
  "serp_api_config": {
    "api_key": "optional_serp_api_key",
    "num_jobs": 10
  }
}
```

-   **query**: The job title or keyword.
-   **location**: City, Country, or "Remote".
-   **portals**: List of sites to scrape. Options: `"linkedin"`, `"indeed"`, `"glassdoor"`, `"naukri"`, `"google"`.
-   **serp_api_config**: (Optional) Only needed if you include `"google"` in portals.

**Response**:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```
👉 **Save the `task_id`!** You will need it for the next steps.

---

#### Step 2: Check Status

**Endpoint**: `GET /api/v1/jobs/status/{task_id}`

Poll this endpoint every few seconds to check if the scrapers have finished.

**Request**:
`GET /api/v1/jobs/status/550e8400-e29b-41d4-a716-446655440000`

**Response (In Progress)**:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "logs": []
}
```

**Response (Completed)**:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "logs": []
}
```

---

#### Step 3: Get Results

**Endpoint**: `GET /api/v1/jobs/results/{task_id}`

Once the status is `completed`, call this to get the aggregated job data.

**Request**:
`GET /api/v1/jobs/results/550e8400-e29b-41d4-a716-446655440000`

**Response**:
```json
[
  {
    "title": "Senior React Developer",
    "company": "Tech Solutions Inc.",
    "location": "Remote",
    "link": "https://linkedin.com/jobs/view/...",
    "description": "We are looking for a React expert...",
    "portal": "linkedin"
  },
  {
    "title": "Full Stack Engineer",
    "company": "StartupAI",
    "location": "Remote",
    "link": "https://in.indeed.com/viewjob?jk=...",
    "description": "Join our fast paced team...",
    "portal": "indeed"
  }
]
```

---

## 📂 Project Structure

```
skillfit-ai/
├── backend/
│   └── app/
│       ├── main.py               # API Entry Point
│       ├── models/               # Pydantic Schemas
│       └── services/             # Orchestration Logic
├── scraper/                      # Python Scraper Scripts
│   ├── linkedin.py
│   ├── Indeed.py
│   ├── Glassdoor.py
│   └── ...
├── requirements.txt              # Dependencies
└── README.md                     # Documentation
```
