# SkillFit AI v2 — Complete Phase-by-Phase Build Plan

---

## Pre-Phase 0 — Repo Surgery (Remove v1 Artifacts)

Before writing a single new line, gut the existing repo.

### What to remove
| Module | Reason |
|---|---|
| `Scraper/linkedin.py`, `Indeed.py`, `Glassdoor.py` | Replaced by SerpAPI. Playwright scrapers are brittle and block-prone. |
| `App/desktop_app.py`, `build_exe.py` | v2 is a web app on AWS, not a desktop app. |
| PyWebView, PyInstaller from `requirements.txt` | Desktop deps gone. |
| Any hardcoded ML-depth logic | Dropped entirely per plan. |
| `frontend/` (v1 React) | Keep folder structure, gut all pages and components — full redesign. |
| `ML/` folder | Keep `data/` (alias JSON stays), nuke everything else and rebuild in `backend/ml/`. |

### New repo structure
```
skillfit-v2/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI routers (auth.py, etc.)
│   │   ├── services/          # Business logic (parsing, scoring, ingestion, agent)
│   │   ├── ml/                # NER, embeddings, cross-encoder
│   │   ├── db/                # Supabase client (supabase_client.py)
│   │   ├── schemas/           # Pydantic schemas (shared)
│   │   └── main.py            # FastAPI app entrypoint
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/             # AuthPage.jsx, ApiKeySetupPage.jsx, etc.
│   │   ├── hooks/
│   │   ├── services/          # Axios API clients
│   │   └── store/             # Redux state (userSlice.js)
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── skill_aliases.json     # Kept from v1, expanded
├── infra/
│   ├── ec2_setup.sh
│   └── nginx.conf
├── tests/
│   ├── unit/
│   └── integration/
└── README.md
```

---

## Production Deployment Architecture

To ensure a highly robust, secure, and zero-cost (free-tier) infrastructure, the final deployment of SkillFit AI follows this distributed architecture:

1. **Frontend**: React/Vite deployed to **Vercel** (Global Edge CDN, auto-provisioned HTTPS).
2. **Backend**: FastAPI running on an **AWS EC2 (t2/t3.micro)** instance.
   - Protected via a **Caddy Reverse Proxy** which automatically issues an SSL certificate via `nip.io` (e.g. `https://<ip>.nip.io`).
   - This ensures secure `https` to `https` communication between Vercel and the backend (solving Mixed Content errors).
3. **Database & Auth**: **Supabase** (Hosted Postgres & Auth), removing the need to manage database infrastructure on AWS.
4. **Vector Database**: **Pinecone** (Hosted Serverless Vector Store) for fast JD matching.
5. **Storage**: **AWS S3** bucket (`skillfit-ai-embeddings`) for storing heavy `.npy` SBERT embeddings, accessed securely via EC2 IAM Roles (no hardcoded keys).
6. **ML Tracking**: **MLflow** running internally on the EC2 instance, logging to a local SQLite database and local block storage, kept secure and offline from the public internet.

---

## Phase 1 — Foundation: Auth (Supabase), DB, API Keys

**Goal:** User authenticates via Supabase Auth, enters API keys in the browser UI, and stores them in `localStorage`/Redux. The backend verifies the Supabase token. No server-side storage or encryption is used.

---

### 1.1 Supabase Client Setup

File: `backend/app/db/supabase_client.py`

```python
from supabase import create_client, Client
import os

def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "https://placeholder.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "placeholder_key")
    return create_client(url, key)

_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = get_supabase()
    return _client
```

---

### 1.2 Supabase Authentication Middleware

File: `backend/app/api/auth.py`

```python
from supabase import Client
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from backend.app.db.supabase_client import get_client

security = HTTPBearer()

async def get_current_user(token=Depends(security), sb: Client = Depends(get_client)):
    # Verifies the supabase jwt token and returns the user details.
    try:
        user_response = sb.auth.get_user(token.credentials)
        return user_response.user
    except Exception as e:
        print(f"auth error: {e}")
        raise HTTPException(status_code=401, detail="invalid or expired token")
```

---

### 1.3 Redux State & Local Key Storage (Frontend)

File: `frontend/src/store/userSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

// Hydrate from localStorage
const savedKeys = JSON.parse(localStorage.getItem('skillfit_keys')) || {
  groq: '',
  scraping: []
};

const initialState = {
  user: null,
  session: null,
  apiKeys: savedKeys,
  apiKeysVerified: savedKeys.groq !== '',
  availableSources: savedKeys.scraping.map(s => s.source)
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
    },
    saveKeysLocally: (state, action) => {
      state.apiKeys = action.payload;
      state.apiKeysVerified = action.payload.groq !== '';
      state.availableSources = action.payload.scraping.map(s => s.source);
      localStorage.setItem('skillfit_keys', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.session = null;
    }
  }
});

export const { setAuth, saveKeysLocally, logout } = userSlice.actions;
export default userSlice.reducer;
```

---

### 1.4 Frontend — Phase 1 Components

Pages: `AuthPage.jsx` and `ApiKeySetupPage.jsx`

`AuthPage.jsx`:
- Dynamic Login and Signup using simple inputs and `supabase.auth` calls.

`ApiKeySetupPage.jsx`:
- Groq API key input.
- Scraper select checkboxes (SerpAPI, SearchAPI, JSearch, LinkedIn).
- Storing chosen sources and keys directly inside Redux/localStorage without hitting backend validation endpoints.
- Unlocks Dashboard button when Groq key is populated.

---

### 1.5 Testing — Phase 1

- Verify `supabase.auth.getSession()` sets correct Redux state.
- Verify `saveKeysLocally` reducer populates `localStorage` correctly.
- Run FastAPI app and verify `GET /api/health` works.

---

### 1.6 MLflow Setup

File: `backend/mlflow_server.py`
```python
import subprocess
subprocess.Popen([
    "mlflow", "server",
    "--host", "127.0.0.1",
    "--port", "5000",
    "--backend-store-uri", "sqlite:///mlflow.db",
    "--default-artifact-root", "./mlflow_artifacts"
])
```

Initialize experiment names at startup:
- `"jd_ingestion"` — tracks ingestion runs
- `"jd_scoring"` — tracks scoring events
- `"rewrite_agent"` — tracks rewrite sessions
- `"rag_queries"` — tracks RAG query quality

---

## Phase 2 — Resume Upload & Parsing

**Goal:** User uploads PDF → system extracts structured skill data → user verifies and corrects → confirmed skills stored with SBERT embedding.

---

### 2.1 PDF Extraction

File: `backend/app/ml/pdf_extractor.py`

```python
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Primary: pdfplumber. Fallback: PyMuPDF (fitz).
    Returns raw text string preserving rough layout.
    Raises: PDFExtractionError if both fail.
    """

def segment_sections(raw_text: str) -> dict[str, str]:
    """
    Rule-based section detection.
    Returns: {"education": str, "experience": str, 
              "projects": str, "skills": str, "certifications": str}
    Uses: header detection (ALL_CAPS lines, common section names).
    No ML, pure regex + heuristics.
    """
```

---

### 2.2 Skill Extraction NER Stack

File: `backend/app/ml/skill_extractor.py`

```python
import spacy
from transformers import pipeline

# Load once at module level (not per request)
_skill_pipeline = pipeline(
    "token-classification",
    model="amjad-awad/skill-extractor",
    aggregation_strategy="simple"
)
_alias_map: dict[str, str] = _load_alias_map("data/skill_aliases.json")

def extract_skills_layer1(text: str) -> list[str]:
    """
    amjad-awad/skill-extractor NER.
    Returns raw skill entity strings found in text.
    """
    results = _skill_pipeline(text)
    return [r["word"] for r in results if r["entity_group"] == "SKILL"]

def normalize_skills_layer2(raw_skills: list[str]) -> list[str]:
    """
    Alias dictionary normalization.
    "torch" → "PyTorch", "k8s" → "Kubernetes"
    Returns deduplicated canonical skill names.
    """
    normalized = set()
    for s in raw_skills:
        canonical = _alias_map.get(s.lower(), s)
        normalized.add(canonical)
    return sorted(normalized)

def extract_skills_from_text(text: str) -> list[str]:
    """
    Combined Layer 1 + Layer 2.
    Used for JD text (no LLM layer for JDs — this is the full pipeline for JDs).
    """
    raw = extract_skills_layer1(text)
    return normalize_skills_layer2(raw)
```

---

### 2.3 Pydantic Schemas for Instructor

File: `backend/app/schemas/resume.py`

```python
from pydantic import BaseModel

class ProjectEntry(BaseModel):
    title: str
    description: str
    skills_mentioned: list[str]

class EducationEntry(BaseModel):
    institution: str
    degree: str
    field: str
    year: str

class ResumeExtraction(BaseModel):
    explicit_skills: list[str]       # from NER layers 1+2
    implicit_skills: list[str]       # surfaced from descriptive context by LLM
    skill_to_evidence: dict[str, str]  # skill → exact line it came from
    experience_bullets: list[str]
    projects: list[ProjectEntry]
    education: list[EducationEntry]
```

---

### 2.4 Instructor LLM Call (Layer 3)

File: `backend/app/services/resume_parser.py`

```python
import instructor
from groq import Groq
from app.schemas.resume import ResumeExtraction

def extract_implicit_skills(
    resume_text: str,
    layer12_skills: list[str],
    groq_key: str
) -> ResumeExtraction:
    """
    One Groq call via Instructor.
    Finds implicit skills NER missed.
    "built semantic search over documents" → RAG
    "optimized transformer latency" → model optimization
    Returns full ResumeExtraction with skill_to_evidence map.
    """
    client = instructor.from_groq(Groq(api_key=groq_key))
    return client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_model=ResumeExtraction,
        messages=[{
            "role": "user",
            "content": f"""
Resume text:
{resume_text}

Skills already identified by NER: {layer12_skills}

Extract:
1. Any additional explicit skills missed above
2. Implicit skills suggested by context (describe what the person DID, even if they didn't name the technology)
3. For every skill (both NER-found and implicit), find the exact line in the resume that provides evidence
4. All experience bullets and project descriptions verbatim
"""
        }]
    )
```

---

### 2.5 Credibility Tagging

File: `backend/app/services/resume_parser.py` (continued)

```python
def tag_skill_credibility(
    skill: str,
    skill_to_evidence: dict[str, str],
    sections: dict[str, str],
    implicit_skills: list[str]
) -> str:
    """
    Returns: "demonstrated" | "listed" | "implicit"
    
    Logic:
    - "implicit": skill is in implicit_skills list
    - "demonstrated": evidence line appears in experience or projects section
    - "listed": evidence line appears only in skills section
    """

def full_parse_pipeline(
    file_bytes: bytes,
    groq_key: str
) -> dict:
    """
    Orchestrates full parse: extract text → segment → layer1+2 NER → layer3 LLM → credibility tags
    Returns serializable dict matching Resume DB model's parsed_json field.
    """
```

---

### 2.6 SBERT Embeddings Storage

Since we're on AWS, `.npy` files go to S3 instead of local EC2 disk. This survives EC2 restarts and scales.

File: `backend/app/ml/embeddings.py`

```python
from sentence_transformers import SentenceTransformer
import numpy as np
import boto3
import io
import os

_sbert = SentenceTransformer("all-MiniLM-L6-v2")  # loaded once
S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "skillfit-embeddings")
s3 = boto3.client("s3")

def embed_text(text: str) -> np.ndarray:
    """Returns 384-dim float32 vector."""
    return _sbert.encode(text, normalize_embeddings=True)

def save_embedding_s3(embedding: np.ndarray, key: str) -> str:
    """Saves .npy to S3. Returns S3 key."""
    buf = io.BytesIO()
    np.save(buf, embedding)
    buf.seek(0)
    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.read())
    return key

def load_embedding_s3(key: str) -> np.ndarray:
    """Loads .npy from S3."""
    obj = s3.get_object(Bucket=S3_BUCKET, Key=key)
    return np.load(io.BytesIO(obj["Body"].read()))

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))  # normalized vectors: dot = cosine
```

S3 bucket structure:
```
skillfit-embeddings/
├── resumes/{resume_id}.npy
└── jd_centroids/{ingestion_run_id}_{role}.npy
```

---

### 2.7 FastAPI Endpoints — Phase 2

File: `backend/app/api/resume.py`

```
POST /api/v1/resume/upload
  body: multipart/form-data (PDF file)
  auth: Bearer token
  → runs full_parse_pipeline async
  → stores raw_text + parsed_json in SQLite
  → returns: resume_id, extracted_skills (grouped by credibility), sections summary

PUT /api/v1/resume/skills/confirm
  body: {
    resume_id: str,
    confirmed_skills: list[str],   # after user edits
    credibility_overrides: dict[str, str],  # user changed a tag
    user_context_note: str
  }
  → updates SQLite confirmed_skills_json + user_context_note
  → computes SBERT embedding of confirmed skills text
  → saves .npy to disk, path stored in DB
  → returns: {status: "confirmed", embedding_ready: true}

GET /api/v1/resume/list
  → returns all resumes for current user with metadata

PUT /api/v1/resume/{resume_id}/set-active
  → flips is_active flag
```

---

### 2.8 Frontend — Phase 2

Pages: `ResumeUploadPage`, `SkillVerificationPage`

`ResumeUploadPage`:
- Drag-and-drop PDF zone
- Progress indicator with stage labels: "Extracting text → Running NER → Surfacing implicit skills → Done"
- Uses polling or WebSocket for progress

`SkillVerificationPage`:
- Three columns: "Demonstrated", "Listed Only", "Implicit (AI found)"
- Each skill is a chip with: skill name, small "evidence" tooltip showing the resume line, remove (×) button
- "+ Add skill" text input at bottom of each column
- Drag between columns to change credibility tag
- Optional free-text box: "Tell us anything that's not on your resume"
- "Confirm Skills" button → POST to confirm endpoint

---

### 2.9 Testing — Phase 2

```
tests/unit/test_pdf_extractor.py     test with sample PDFs
tests/unit/test_skill_extractor.py   test layer1+2 on known resume text
tests/unit/test_credibility_tags.py  test all three tag paths
tests/unit/test_embeddings.py        shape, normalization, cosine = 1.0 for identical
tests/integration/test_resume_api.py upload → confirm round-trip
```

---

## Phase 3 — Target Role Selection & JD Ingestion

**Goal:** User picks role → system expands titles → user approves → 100-300 JDs scraped, parsed, embedded, market profile computed, all insights pre-computed.

---

### 3.1 Role Expansion via LLM

File: `backend/app/services/role_expansion.py`

```python
from pydantic import BaseModel

class RoleExpansion(BaseModel):
    alternate_titles: list[str]  # 4-5 titles

def expand_role_titles(role_name: str, groq_key: str) -> list[str]:
    """
    One Groq/Instructor call.
    Input: "Data Scientist"
    Output: ["Data Scientist", "ML Engineer", "Applied Scientist", 
             "Research Scientist", "Data Science Engineer"]
    Works for any domain — DevOps, Marketing, etc.
    """

ROLE_TAXONOMY = [
    "Data Scientist", "ML Engineer", "Gen AI Engineer", "NLP Engineer",
    "MLOps Engineer", "Data Engineer", "Backend Engineer", "DevOps Engineer",
    "Platform Engineer", "SRE", "Frontend Engineer", "Full Stack Engineer",
    "Product Manager", "Marketing Analyst", "Growth Analyst",
    # ... ~30 total
]
```

---

### 3.2 Multi-Source JD Fetching (Unified Scraper)

File: `backend/app/services/scraper/unified.py`

This wraps all scraper sources behind a single interface. The ingestion pipeline calls only this — it doesn't care which source produced a JD.

```python
from dataclasses import dataclass
from typing import Protocol

@dataclass
class RawJD:
    source: str          # which scraper produced this
    raw_title: str
    company: str
    location: str
    description_text: str
    url: str
    scraped_date: str

class ScraperSource(Protocol):
    def fetch(self, query: str, location: str, key: str | None) -> list[RawJD]: ...

# Source priority order (most to least reliable):
# 1. SerpAPI (structured Google Jobs response)
# 2. JSearch (RapidAPI — large volume)
# 3. SearchAPI (fallback if JSearch quota hit)
# 4. LinkedIn RapidAPI (title-specific roles)
# 5. Greenhouse (no key, always available, good for company-specific JDs)

async def fetch_jds_for_role(
    approved_titles: list[str],
    location: str,
    available_sources: list[dict],  # [{source: str, key: str}] from user's stored keys
    target_count: int = 200
) -> list[RawJD]:
    """
    Tries sources in priority order until target_count JDs collected.
    For each title variant, queries 3 search strings:
      - "{title} fresher {location}"
      - "{title} 0-2 years {location}"  
      - "{title} entry level {location}"
    Greenhouse always queried regardless of user keys (no auth needed).
    Stops early if target_count reached.
    Returns combined raw JD list before deduplication.
    """
```

File: `backend/app/services/scraper/dedup.py`

```python
def deduplicate_jds(jds: list[RawJD]) -> list[RawJD]:
    """
    Primary key: URL (exact match).
    Fallback composite key: (company.lower() + title.lower() + location.lower())
    Returns unique JDs only, preferring the first source encountered (higher priority).
    """
    seen_urls: set[str] = set()
    seen_composite: set[str] = set()
    result = []
    for jd in jds:
        composite = f"{jd.company.lower()}|{jd.raw_title.lower()}|{jd.location.lower()}"
        if jd.url not in seen_urls and composite not in seen_composite:
            seen_urls.add(jd.url)
            seen_composite.add(composite)
            result.append(jd)
    return result
```

Source-specific notes:
- **SerpAPI**: returns structured JSON from Google Jobs — cleanest data, use as primary
- **JSearch**: high volume via RapidAPI, good for fresher roles
- **SearchAPI**: similar to SerpAPI, use as fallback
- **LinkedIn RapidAPI**: title matching is tighter, good for senior/specific roles — less useful for fresher breadth queries, include but lower priority
- **Greenhouse**: job board API, no auth, good for startup/tech company JDs specifically; query with role name directly

---

### 3.3 Market Profile Computation

File: `backend/app/services/market_profile.py`

```python
from collections import Counter, defaultdict

def compute_market_profile(jds_with_skills: list[dict]) -> dict[str, float]:
    """
    Returns: {skill: frequency} where frequency = count/total_jds
    frequency range: 0.0 to 1.0
    """

def tier_skills(market_profile: dict) -> dict[str, list[str]]:
    """
    Returns: {
        "high": [...],    # >= 0.6
        "medium": [...],  # 0.3 - 0.6
        "low": [...]      # < 0.3
    }
    """

def normalize_title(raw_title: str) -> str:
    """
    Strips seniority prefixes/suffixes.
    "Senior Data Scientist" → "Data Scientist"
    "Lead ML Engineer" → "ML Engineer"
    Seniority words: Senior, Junior, Lead, Staff, Principal, Head of, 
                     Associate, Entry Level, Jr., Sr.
    """

def compute_role_clusters(jds: list[dict]) -> dict[str, dict]:
    """
    Groups JDs by normalized title.
    For each group, computes that cluster's market profile.
    Returns: {
        "ML Engineer": {"market_profile": {...}, "jd_count": 45},
        "Data Scientist": {"market_profile": {...}, "jd_count": 67},
        ...
    }
    """

def compute_skill_cooccurrence(jds: list[dict], top_n: int = 10) -> dict:
    """
    For top N skills by frequency, find their strongest co-occurring partner.
    Returns: {"LangChain": {"partner": "ChromaDB", "rate": 0.82}, ...}
    """

def classify_freshness(jd_text: str) -> bool:
    """
    Rule-based. Returns True if JD is fresher-friendly.
    Checks for: "0-2 years", "0-1 year", "fresher", "entry level", 
                "recent graduate", "new grad"
    """
```

---

### 3.4 Pinecone Integration

File: `backend/app/ml/vector_store.py`

```python
from pinecone import Pinecone, ServerlessSpec

def get_pinecone_client(api_key: str) -> Pinecone:
    return Pinecone(api_key=api_key)

def get_or_create_index(pc: Pinecone, index_name: str = "skillfit-jds"):
    """
    Free tier: 1 index, serverless.
    Dimension: 384 (all-MiniLM-L6-v2 output).
    Metric: cosine.
    Creates if not exists, returns index object.
    """

def upsert_jd_embeddings(
    index,
    namespace: str,           # "run_{ingestion_run_id}"
    jd_ids: list[str],
    embeddings: list[list[float]],
    metadata: list[dict]
) -> None:
    """
    Batch upsert to Pinecone.
    Metadata per vector: {company, normalized_title, skills, is_fresher_friendly, url}
    """

def query_similar_jds(
    index,
    namespace: str,
    query_embedding: list[float],
    top_k: int = 20,
    filter_dict: dict = None
) -> list[dict]:
    """
    Returns top_k similar JDs with scores and metadata.
    Optional filter: {"is_fresher_friendly": True}
    """

def get_all_jd_embeddings(index, namespace: str) -> tuple[list[str], list[list[float]]]:
    """
    Fetches all vector ids + embeddings from namespace.
    Used for What-If pre-computation.
    """
```

---

### 3.5 What-If Pre-computation

File: `backend/app/services/whatif_precompute.py`

```python
import numpy as np
from collections import Counter

def compute_market_score(
    resume_skills: set[str],
    market_profile: dict[str, float]
) -> float:
    """
    market_score = 0.6 * coverage(high) + 0.3 * coverage(medium) + 0.1 * coverage(low)
    coverage = len(resume_skills & tier_skills) / len(tier_skills) if tier_skills else 0
    """

def get_eligible_jd_ids(
    resume_skills: set[str],
    all_jds: list[dict],
    threshold: float = 0.65
) -> set[str]:
    """
    JD is eligible if coverage(resume_skills, jd.extracted_skills) >= threshold
    Returns set of jd_ids.
    Pure set operations, vectorized loop.
    """

def precompute_skill_deltas(
    resume_skills: set[str],
    market_profile: dict[str, float],
    all_jds: list[dict],
    top_n_missing: int = 30
) -> dict:
    """
    Pre-computes delta for each of top 30 missing skills.
    Returns: {
        skill: {
            "score_delta": float,
            "new_eligible_jd_ids": list[str],
            "new_eligible_count": int
        }
    }
    NOTE: uses vectorized NumPy, not Python loops for cosine — fast at 200 JDs × 30 skills.
    """
```

---

### 3.6 MLflow — Ingestion Run Logging

File: `backend/app/services/mlflow_logger.py`

```python
import mlflow

def log_ingestion_run(
    target_role: str,
    jd_count: int,
    top_20_skills: list[tuple[str, float]],
    market_profile_snapshot: dict,
    extraction_coverage_estimate: float,  # skills_found / jd_count approximation
    role_clusters_summary: dict
) -> str:
    """
    Logs to "jd_ingestion" experiment.
    Returns: mlflow run_id (stored in JDIngestionRun table for traceability).
    
    Logged metrics:
    - jd_count
    - extraction_coverage_estimate
    - unique_skills_found
    - role_cluster_count
    - fresher_friendly_jd_ratio
    
    Logged params:
    - target_role
    - ingestion_timestamp
    
    Logged artifacts:
    - market_profile.json (full skill frequency dict)
    - top_skills_chart.png (bar chart of top 20)
    """
```

---

### 3.7 FastAPI Endpoints — Phase 3

File: `backend/app/api/roles.py`

```
POST /api/v1/roles/expand
  body: {role_name: str}
  → calls expand_role_titles LLM
  → returns: {expanded_titles: list[str]}

POST /api/v1/jobs/ingest
  body: {
    resume_id: str,
    role_name: str,
    approved_titles: list[str],
    location: str  # default "India"
  }
  → creates TargetRole record
  → fires async background task
  → returns: {target_role_id: str, task_id: str}

GET /api/v1/jobs/ingest/status/{task_id}
  → returns: {
      status: "running" | "done" | "failed",
      progress: int,       # 0-100
      stage: str,          # "fetching" | "parsing" | "embedding" | "computing"
      jds_processed: int
    }
```

---

### 3.8 Frontend — Phase 3

Pages: `RoleSelectionPage`, `IngestionProgressPage`

`RoleSelectionPage`:
- Autocomplete input (from ROLE_TAXONOMY)
- After typing, user hits "Expand Titles" → LLM call
- Shows expanded titles as checkboxes, all checked by default
- User can uncheck any
- Location dropdown (default India, can change)
- "Start Fetching Jobs" → starts ingestion

`IngestionProgressPage`:
- Animated progress bar
- Stage labels with spinners: "Fetching JDs (127/200) → Extracting skills → Computing market profile → Building embeddings → Pre-computing insights"
- Live JD count updates via polling
- On completion → auto-navigate to Dashboard

---

### 3.9 Testing — Phase 3

```
tests/unit/test_market_profile.py       frequency computation, tiering
tests/unit/test_role_normalizer.py      seniority stripping
tests/unit/test_cooccurrence.py         co-occurrence matrix
tests/unit/test_whatif_precompute.py    delta math, no double counting
tests/unit/test_freshness_classifier.py rule-based classification
tests/integration/test_ingestion.py     mock SerpAPI, full pipeline
tests/integration/test_pinecone.py      upsert + query round-trip
```

---

## Phase 4 — Dashboard, JD Insights & Resume Insights

**Goal:** All pre-computed data surfaces as visual dashboards. Zero computation on request — all reads from SQLite/pre-computed JSON.

---

### 4.1 Market Score Computation (Pre-computed)

File: `backend/app/services/scoring_service.py`

```python
def compute_market_score_breakdown(
    confirmed_skills: set[str],
    market_profile: dict,
    tiered_skills: dict
) -> dict:
    """
    Returns: {
        "overall_score": float,
        "high_demand_coverage": float,
        "medium_demand_coverage": float,
        "low_demand_coverage": float,
        "top_5_missing_high": list[str],
        "top_5_strongest_matched": list[str]
    }
    Called at end of ingestion, stored in jd_ingestion_runs.insights_json.
    """
```

---

### 4.2 Role Fit (Pre-computed)

File: `backend/app/services/resume_insights.py`

```python
def compute_role_fit(
    resume_embedding: np.ndarray,
    role_clusters: dict[str, dict],
    all_jd_embeddings: dict[str, np.ndarray]  # normalized_title → mean embedding
) -> dict[str, float]:
    """
    Cosine similarity of resume embedding vs centroid of each role cluster.
    Returns: {"ML Engineer": 0.79, "Data Scientist": 0.63, ...}
    """

def compute_market_positioning(
    resume_skills: set[str],
    role_clusters: dict[str, dict]
) -> list[dict]:
    """
    For each role cluster, computes tier + missing skills.
    Returns: [
        {"role": "ML Engineer", "tier": "apply_now", "missing": []},
        {"role": "Gen AI Engineer", "tier": "close", "missing": ["LangChain", "RAG", "LangGraph"]},
        ...
    ]
    """

def get_skill_signal_strength(
    confirmed_skills: list[str],
    skill_to_evidence: dict[str, str],
    implicit_skills: list[str],
    sections: dict[str, str]
) -> dict:
    """
    Returns: {
        "strong": [skill, ...],   # in experience/projects
        "weak": [skill, ...],     # listed only
        "implicit": [skill, ...], # surfaced by LLM
        "advisories": {skill: "Add a project bullet showing usage"}
    }
    """
```

---

### 4.3 FastAPI Endpoints — Phase 4

```
GET /api/v1/dashboard/market-score
  params: target_role_id
  → reads from pre-computed insights_json in JDIngestionRun
  → returns market score breakdown

GET /api/v1/insights/jd
  params: target_role_id
  → returns pre-computed chart data: top_skills, role_breakdown, seniority_breakdown, cooccurrence

GET /api/v1/insights/resume
  params: resume_id, target_role_id
  → returns role_fit scores, skill_signal_strength, market_positioning
```

---

### 4.4 Frontend — Phase 4

Pages: `DashboardPage`, `JDInsightsPage`, `ResumeInsightsPage`

`DashboardPage`:
- Hero card: Market Score as large percentage with animated fill ring
- Three breakdown bars: High/Medium/Low demand coverage
- "Top 5 Missing High-Demand Skills" — each as a clickable chip (clicking goes to What-If with that skill toggled)
- "Your Strongest Matched Skills" — chips with demand %
- Stale warning banner if ingestion > 30 days old

`JDInsightsPage`:
- Chart 1: Horizontal bar chart (Recharts), top 20 skills by demand %, color-coded by tier
- Chart 2: Donut, role type breakdown
- Chart 3: Donut, seniority distribution (fresher-friendly vs mid vs senior)
- Chart 4: Table — top 10 co-occurrence pairs

`ResumeInsightsPage`:
- Role Fit section: horizontal bars per role, color by tier (green/yellow/red)
- Skill Signal Strength: three columns (strong/weak/implicit) with advisory tooltips
- Market Positioning cards: one card per role with tier badge + missing skills list

---

## Phase 5 — What-If Simulator

**Goal:** Interactive skill toggle dashboard with instant response. Zero API calls after page load.

---

### 5.1 FastAPI Endpoint

```
GET /api/v1/simulator/data
  params: target_role_id, resume_id
  → returns: {
      base_score: float,
      base_eligible_count: int,
      resume_skills: list[str],
      skill_deltas: {skill: {score_delta, new_eligible_count, new_eligible_jd_ids}},
      market_profile: {skill: frequency}
    }
  Single payload, loaded once by frontend.
```

---

### 5.2 Client-Side Combination Logic

File: `frontend/src/utils/whatif.ts`

```typescript
export function computeCombinedScore(
  resumeSkills: string[],
  selectedSkills: string[],
  marketProfile: Record<string, number>,
  skillDeltas: Record<string, SkillDelta>
): WhatIfResult {
  // augmented skills = resume + selected
  // new_score = compute_market_score(augmented, market_profile)
  // newly_eligible = union of new_eligible_jd_ids for selected skills (set union, no double count)
  // Returns: {projected_score, score_delta, newly_eligible_jobs}
}

export function computeMarketScore(
  skills: string[],
  marketProfile: Record<string, number>
): number {
  // Pure JS: same formula as backend
  // 0.6 * high_coverage + 0.3 * med_coverage + 0.1 * low_coverage
}
```

---

### 5.3 Frontend — Phase 5

Page: `WhatIfSimulatorPage`

- Left panel: "Missing Skills" list, sorted by score_delta descending
- Each skill shows: skill name, "+X.X% score", "+N jobs" badge
- Toggle checkbox to add/remove
- Right panel: Live updating stats card — "Projected Score: 74%", "Score Change: +8.3%", "New Jobs Unlocked: 23"
- Animated score ring updates on toggle (CSS transition)
- "What if you learned all top 5?" button — bulk toggles top 5
- Skill search/filter box for when list is long

---

## Phase 6 — Specific JD Scoring

**Goal:** User picks a JD → three-signal deep scoring → results stored → feeds rewrite agent.

---

### 6.1 Cross-Encoder Setup

File: `backend/app/ml/cross_encoder.py`

```python
from sentence_transformers import CrossEncoder

_cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def score_resume_jd_pair(resume_text: str, jd_text: str) -> float:
    """
    Local inference. ~80MB model loaded once at EC2 startup.
    Returns: float score (raw logit, normalize to 0-1 with sigmoid)
    """
    import torch
    raw = _cross_encoder.predict([(resume_text, jd_text)])[0]
    return float(torch.sigmoid(torch.tensor(raw)))
```

---

### 6.2 LLM Judgment Schema

File: `backend/app/schemas/scoring.py`

```python
class LLMJudgment(BaseModel):
    implicit_skills_found: list[str]   # skills LLM found that spaCy missed
    genuine_gaps: list[str]            # truly missing, can't be surfaced
    overall_fit: float                 # 0.0 to 1.0
    reasoning: str                     # 2-3 sentence explanation
```

---

### 6.3 Scoring Orchestration

File: `backend/app/services/scoring_service.py` (continued)

```python
async def score_resume_against_jd(
    resume_id: str,
    jd_id: str,
    groq_key: str,
    db: Session
) -> dict:
    """
    1. Load resume text + confirmed_skills from DB
    2. Load JD text from DB
    3. Extract JD skills via skill_extractor.extract_skills_from_text()
    4. Compute skill_coverage = len(resume_skills & jd_skills) / len(jd_skills)
    5. Compute cross_encoder_score via cross_encoder.score_resume_jd_pair()
    6. Call Groq for LLM judgment (Instructor)
    7. final_score = 0.35 * cross_encoder + 0.35 * llm.overall_fit + 0.30 * skill_coverage
    8. Store ScoringEvent in DB
    9. Log to MLflow "jd_scoring" experiment
    10. Return full breakdown
    """

def log_scoring_event(
    resume_id: str,
    jd_id: str,
    scores: dict,
    mlflow_run_name: str
) -> None:
    """
    MLflow logs:
    Metrics: cross_encoder_score, skill_coverage_score, llm_score, final_score
    Params: resume_id, jd_id, model_used
    Artifacts: judgment_json (full LLMJudgment dict)
    """
```

---

### 6.4 FastAPI Endpoints — Phase 6

```
GET /api/v1/jobs/list
  params: target_role_id, page, page_size, filter_fresher_only (bool)
  → returns paginated JDs with pre-extracted skills list

POST /api/v1/score/jd
  body: {resume_id: str, jd_id: str}
  → runs three-signal scoring
  → returns: {
      final_score: float,
      cross_encoder_score: float,
      skill_coverage_score: float,
      llm_score: float,
      matched_skills: list[str],
      missing_skills: list[str],
      implicit_skills_found: list[str],
      genuine_gaps: list[str],
      reasoning: str,
      scoring_event_id: str
    }

GET /api/v1/score/history
  params: resume_id
  → returns all scoring events for resume, sorted by scored_at desc

POST /api/v1/jobs/save
  body: {jd_id: str}
  → creates SavedJD record

PUT /api/v1/jobs/saved/{saved_jd_id}/status
  body: {status: str}
  → updates application_status

GET /api/v1/jobs/saved
  → returns all saved JDs for user with current status
```

---

### 6.5 Frontend — Phase 6

Pages: `JobsListPage`, `JDDetailPage`, `ScoringResultPage`, `SavedJobsPage`

`JobsListPage`:
- Card grid of JDs with: company, title, location, is_fresher_friendly badge
- Filter bar: fresher-friendly toggle, role type multiselect
- Each card has "Score My Resume" button + "Save" bookmark button
- Scored JDs show their final score badge

`JDDetailPage`:
- Full JD description
- Extracted skills chips (highlighted which you have vs missing)
- "Score My Resume Against This JD" CTA

`ScoringResultPage`:
- Large score circle with final_score
- Three signal breakdown: bars for cross-encoder, skill coverage, LLM judgment
- "Skills You Have" vs "Missing Skills" columns
- "Implicit Skills Found" section (LLM surfaced these, good news)
- "Genuine Gaps" — skills truly missing
- LLM reasoning paragraph
- "Rewrite My Resume for This JD" CTA → goes to Phase 7

`SavedJobsPage`:
- Kanban or list view with status columns: Saved → Applied → Interviewed → Result
- Drag-and-drop status update (or dropdown)
- Quick link to scoring result for each saved JD

---

## Phase 7 — RAG on JDs

**Goal:** User can ask natural language questions about the JD corpus. RAGAS evaluation tracked in MLflow.

---

### 7.1 RAG Query Pipeline

File: `backend/app/services/rag_service.py`

```python
async def rag_query(
    question: str,
    target_role_id: str,
    pinecone_index,
    namespace: str,
    groq_key: str,
    db: Session
) -> dict:
    """
    1. Embed question with SBERT
    2. Query Pinecone namespace for top_k=8 JDs
    3. Retrieve full JD text from SQLite for each hit
    4. Build context: concatenate JD excerpts with company/title metadata
    5. One Groq call: answer question grounded in retrieved JDs
    6. Compute RAGAS metrics (faithfulness, answer_relevance, context_precision)
    7. Log RAGAS metrics to MLflow "rag_queries" experiment
    8. Return answer + source JDs + RAGAS scores
    """

def compute_ragas_metrics(
    question: str,
    answer: str,
    contexts: list[str],
    groq_key: str
) -> dict:
    """
    Uses ragas library.
    Returns: {faithfulness: float, answer_relevance: float, context_precision: float}
    """
```

---

### 7.2 MLflow — RAG Logging

```python
def log_rag_query(
    question: str,
    answer: str,
    target_role_id: str,
    ragas_metrics: dict,
    top_k_jd_ids: list[str]
) -> None:
    """
    MLflow "rag_queries" experiment.
    Metrics: faithfulness, answer_relevance, context_precision
    Params: target_role, top_k
    Artifacts: query_log.json {question, answer, sources}
    """
```

---

### 7.3 FastAPI Endpoints — Phase 7

```
POST /api/v1/rag/query
  body: {question: str, target_role_id: str}
  → runs RAG pipeline
  → returns: {
      answer: str,
      source_jds: [{company, title, excerpt}],
      ragas_scores: {faithfulness, answer_relevance, context_precision}
    }
```

---

### 7.4 Frontend — Phase 7

Component: `RAGQueryPanel` (embedded in JDInsightsPage as collapsible panel)

- Text input with placeholder examples: "What do most companies expect for deployment?" "Which companies mention mentorship?"
- Sends query, shows loading state
- Answer rendered in card with source JD citations (expandable)
- Small RAGAS score badges for transparency: "Faithfulness: 0.91"
- Query history within session (stored in component state)

---

## Phase 8 — Resume Rewrite Agent (LangGraph)

**Goal:** Human-in-the-loop agentic workflow to improve resume for a specific JD. Runs after Phase 6 scoring.

---

### 8.1 LangGraph State

File: `backend/app/services/rewrite_agent/state.py`

```python
from typing import TypedDict, Optional

class AgentState(TypedDict):
    resume_id: str
    jd_id: str
    scoring_event_id: str
    resume_text: str
    resume_sections: dict[str, str]
    skill_to_evidence: dict[str, str]
    target_jd_text: str
    gap_report: dict                   # GapReport serialized
    user_context: dict                 # UserContext serialized
    generated_questions: list[str]
    user_answers: str
    enriched_gap_report: dict
    rewrite_plan: list[dict]
    plan_approved: bool
    rewritten_sections: dict[str, str]
    accepted_changes: list[dict]
    initial_score: float
    current_score: float
    final_resume_text: str
    session_id: str
```

---

### 8.2 Pydantic Schemas for Agent

File: `backend/app/schemas/rewrite.py`

```python
class GapReport(BaseModel):
    present_and_strong: list[str]
    present_but_weak: list[str]         # listed only
    implicit_candidates: list[str]      # LLM found but not named
    genuine_gaps: list[str]             # truly missing

class UserContext(BaseModel):
    confirmed_implicit_skills: list[str]
    additional_projects: list[dict]     # {title, description, skills}
    additional_skills: list[str]
    honest_qualifiers: dict[str, str]   # skill → "basic familiarity only"

class RewritePlanItem(BaseModel):
    section: str
    original_text: str
    goal: str
    justification: str
    evidence: str

class RewrittenSection(BaseModel):
    section: str
    original: str
    rewritten: str
    changes_made: str
```

---

### 8.3 LangGraph Nodes

File: `backend/app/services/rewrite_agent/nodes.py`

```python
def analyze_gap(state: AgentState) -> AgentState:
    """
    Uses scoring_event LLM judgment output + skill_to_evidence map.
    No new LLM call — reuses Stage 10 output.
    Populates: state["gap_report"]
    """

def generate_questions(state: AgentState) -> AgentState:
    """
    LLM call (Groq). Generates targeted questions from gap_report.
    Only questions about bridgeable gaps (implicit_candidates + present_but_weak).
    Skips genuine_gaps — can't bridge those.
    Populates: state["generated_questions"]
    INTERRUPTS HERE — returns to frontend for user input.
    """

def enrich_from_user_response(state: AgentState) -> AgentState:
    """
    LLM call (Groq + Instructor). 
    Extracts UserContext from free-text user answers.
    Updates gap_report — some genuine gaps may move to implicit_candidates.
    Populates: state["user_context"], state["enriched_gap_report"]
    """

def build_rewrite_plan(state: AgentState) -> AgentState:
    """
    LLM call (Groq). Ordered list of RewritePlanItems.
    Shows: which bullets, what to change, why, what evidence justifies it.
    Populates: state["rewrite_plan"]
    INTERRUPTS HERE — returns to frontend for approval.
    """

def execute_rewrites(state: AgentState) -> AgentState:
    """
    LLM call per section in approved plan (Groq).
    Strict prompt: only rephrase existing or user-confirmed content.
    Outputs plain text diffs (original vs rewritten).
    INTERRUPTS per section — user accepts/rejects each change.
    Populates: state["rewritten_sections"], state["accepted_changes"]
    """

def rescore(state: AgentState) -> AgentState:
    """
    Runs full Phase 6 scoring on rewritten resume.
    Updates: state["current_score"]
    """

def final_output(state: AgentState) -> AgentState:
    """
    Compiles accepted changes into final plain text resume.
    Generates change log.
    Stores RewriteSession in DB.
    Logs to MLflow "rewrite_agent" experiment.
    Populates: state["final_resume_text"]
    """
```

---

### 8.4 LangGraph Graph Definition

File: `backend/app/services/rewrite_agent/graph.py`

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

def build_rewrite_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("analyze_gap", analyze_gap)
    workflow.add_node("generate_questions", generate_questions)
    workflow.add_node("enrich_from_user_response", enrich_from_user_response)
    workflow.add_node("build_rewrite_plan", build_rewrite_plan)
    workflow.add_node("execute_rewrites", execute_rewrites)
    workflow.add_node("rescore", rescore)
    workflow.add_node("final_output", final_output)
    
    workflow.set_entry_point("analyze_gap")
    workflow.add_edge("analyze_gap", "generate_questions")
    # generate_questions → interrupt → resume at enrich_from_user_response
    workflow.add_edge("generate_questions", "enrich_from_user_response")
    workflow.add_edge("enrich_from_user_response", "build_rewrite_plan")
    # build_rewrite_plan → interrupt → resume at execute_rewrites
    workflow.add_edge("build_rewrite_plan", "execute_rewrites")
    # execute_rewrites → interrupt per section → loops back or moves on
    workflow.add_edge("execute_rewrites", "rescore")
    workflow.add_edge("rescore", "final_output")
    workflow.add_edge("final_output", END)
    
    # SQLite checkpointer for interrupt/resume persistence
    memory = SqliteSaver.from_conn_string("skillfit_agent_checkpoints.db")
    return workflow.compile(
        checkpointer=memory,
        interrupt_before=["enrich_from_user_response", "execute_rewrites"],
        interrupt_after=["generate_questions", "build_rewrite_plan"]
    )
```

---

### 8.5 MLflow — Rewrite Session Logging

```python
def log_rewrite_session(
    session_id: str,
    initial_score: float,
    final_score: float,
    changes_accepted: int,
    changes_rejected: int,
    turns_taken: int
) -> None:
    """
    MLflow "rewrite_agent" experiment.
    Metrics: initial_score, final_score, score_delta, accept_ratio
    Params: session_id, resume_id, jd_id
    """
```

---

### 8.6 FastAPI Endpoints — Phase 8

```
POST /api/v1/agent/rewrite/start
  body: {resume_id: str, jd_id: str, scoring_event_id: str}
  → creates AgentState, runs to first interrupt
  → returns: {session_id: str, interrupt_type: "questions", questions: list[str]}

POST /api/v1/agent/rewrite/respond
  body: {session_id: str, user_response: str}
  → resumes graph from interrupt
  → returns: next interrupt or plan or section diff

POST /api/v1/agent/rewrite/approve-plan
  body: {session_id: str, approved_items: list[int], rejected_items: list[int]}

POST /api/v1/agent/rewrite/accept-change
  body: {session_id: str, section: str, accepted: bool}

GET /api/v1/agent/rewrite/result/{session_id}
  → returns final_resume_text, change_log, score_delta

WebSocket /api/v1/agent/rewrite/stream/{session_id}
  → streams agent progress tokens to frontend in real-time
```

---

### 8.7 Frontend — Phase 8

Page: `RewriteAgentPage`

This is a multi-step wizard interface:

Step 1 — Gap Analysis:
- Shows gap_report visually: four sections (strong / weak signal / implicit / genuine gaps)
- "Start Rewrite" button

Step 2 — Questions (interrupt 1):
- Agent's targeted questions rendered as cards
- Free-text response area for user
- "Submit Answers" button

Step 3 — Rewrite Plan (interrupt 2):
- Ordered list of plan items
- Each item: section name, what will change, why
- Checkbox to include/exclude each item
- "Approve Plan" button

Step 4 — Section-by-Section Review (interrupt per section):
- Side-by-side diff view: original (left) vs rewritten (right)
- Changed words/phrases highlighted
- "Accept" / "Reject" / "Edit" buttons per section
- Progress indicator: "Section 3 of 7"

Step 5 — Rescoring:
- Animated score transition: "61% → 79%"
- Remaining genuine gaps shown

Step 6 — Download:
- Final resume text in clean copy-paste format
- "Copy to Clipboard" button
- Change log collapsible section

---

## Phase 9 — AWS Deployment

**Goal:** App is live, accessible via URL, production-ready.

---

### 9.1 EC2 Setup Script

File: `infra/ec2_setup.sh`

```bash
#!/bin/bash
# Ubuntu 22.04, t3.medium (2 vCPU, 4GB RAM)

# System deps
apt-get update && apt-get install -y python3-pip python3-venv nginx

# App directory
mkdir -p /app/skillfit
cd /app/skillfit

# Python env
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Download ML models on startup (not in Docker image to save space)
python -c "
from sentence_transformers import SentenceTransformer, CrossEncoder
SentenceTransformer('all-MiniLM-L6-v2')   # downloads and caches
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
from transformers import pipeline
pipeline('token-classification', model='amjad-awad/skill-extractor')
print('All models cached.')
"

# Systemd services for FastAPI + MLflow
```

---

### 9.2 S3 + CloudFront for Frontend

```bash
# Build React
cd frontend && npm run build

# Sync to S3
aws s3 sync dist/ s3://skillfit-frontend/ --delete

# CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"
```

---

### 9.3 Nginx Config

File: `infra/nginx.conf`

```nginx
server {
    listen 80;
    server_name api.skillfit.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/v1/agent/rewrite/stream/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Phase Summary Table

| Phase | What Gets Built | Key Deliverables |
|---|---|---|
| 0 | Repo surgery | Clean repo, new structure |
| 1 | Auth + DB + API keys | Login, key setup, full schema |
| 2 | Resume parsing | PDF → NER → Instructor → verified skills |
| 3 | Role selection + JD ingestion | SerpAPI, market profile, Pinecone, MLflow |
| 4 | Dashboards + Insights | Market score, 4 charts, role fit, positioning |
| 5 | What-If Simulator | Pre-computed deltas, client-side JS logic |
| 6 | Specific JD Scoring | Cross-encoder + LLM judgment, saved JDs |
| 7 | RAG on JDs | Query corpus, RAGAS eval, MLflow |
| 8 | Rewrite Agent | LangGraph, 3 interrupts, rescore, output |
| 9 | AWS Deployment | EC2, S3, CloudFront, Nginx |

---

## Complete requirements.txt

```
# Web framework
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# DB
sqlalchemy==2.0.30

# Encryption
cryptography==42.0.5

# PDF
pdfplumber==0.11.0
pymupdf==1.24.3

# ML / NLP
spacy==3.7.4
transformers==4.41.0
sentence-transformers==3.0.0
torch==2.3.0
instructor==1.2.3

# LLM clients
groq==0.9.0

# Job scraping
google-search-results==2.4.2   # serpapi

# Vector DB
pinecone-client==4.1.0

# Agent
langgraph==0.1.14

# RAG eval
ragas==0.1.9

# Experiment tracking
mlflow==2.13.0

# Utilities
numpy==1.26.4
pydantic==2.7.1
python-dotenv==1.0.1
httpx==0.27.0
aiofiles==23.2.1
```

---

## MLflow Dashboard — What You Screenshot for Portfolio

| Experiment | What's Tracked | Why It's Impressive |
|---|---|---|
| jd_ingestion | JD count, extraction coverage, top 20 skills chart | Shows data pipeline observability |
| jd_scoring | Score breakdown per event, model used | Shows multi-signal evaluation thinking |
| rag_queries | faithfulness, answer_relevance, context_precision | RAGAS on RAG = rare at fresher level |
| rewrite_agent | initial vs final score delta, accept ratio | End-to-end agent evaluation |

---

## Resume Bullet (When Done)

```
SkillFit AI v2 — AI-Powered Career Intelligence Platform
• End-to-end JD ingestion pipeline: SerpAPI → amjad-awad/skill-extractor NER →
  Pinecone vector store (100K+ vectors, namespaced per session)
• Three-signal resume scoring: cross-encoder reranking + Groq LLM judgment 
  (Instructor/Pydantic) + skill coverage analysis
• RAG pipeline over live JD corpus with RAGAS evaluation 
  (faithfulness, answer relevance, context precision) tracked in MLflow
• Human-in-the-loop rewrite agent (LangGraph, 3 interrupt points) with gap analysis,
  user Q&A enrichment, section-level diffs, and iterative rescoring
• What-if skill simulator: pre-computed deltas for 30 skills, 
  client-side combinatorial scoring (zero API calls on interaction)
• Deployed on AWS (EC2 t3.medium + S3 + CloudFront), FastAPI + React + Pinecone
```
