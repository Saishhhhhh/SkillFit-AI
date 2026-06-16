
<div align="center">

<h1><b>🚀 SkillFit AI <b> </h1>
<p><strong>Bridging the Gap Between Your Resume and Your Dream Job.</strong></p>

</div>

---

## 📋 Table of Contents

- [Description](#-description)
- [Demo Video](#-demo-video)
- [Features](#-features)
- [User Journey](#-user-journey)
- [Project Structure](#-project-structure)
- [Built With](#️-built-with)
- [Documentation](#-documentation)
- [Installation](#-installation)

---

## 📚 Description

**SkillFit AI** is an intelligent career assistant that empowers job seekers by decoding the market. It uses advanced Machine Learning to deeply analyze your resume, compare it against live job listings from top platforms (LinkedIn, Indeed, Glassdoor), and provide actionable, data-driven insights. Whether you're looking for a role change or upskilling, SkillFit AI tells you exactly what you're missing and how to get there.

---

## 🎥 Demo Video

**See SkillFit AI in Action!** 

📺 **[Watch Demo Video](https://youtu.be/6aciuX2t4sM))**

*Experience the power of semantic matching, real-time scraping, and AI-driven career roadmaps.*

---

## ✨ Features

- 📄 **Resume Parsing**: Deep extraction of skills, experience, and domain knowledge from PDF resumes.
- 🌍 **Real-Time Job Scraping**: Aggregates live jobs from LinkedIn, Indeed, Glassdoor, Naukri, and Google Jobs.
- 🧠 **AI Gap Analysis**: Uses Vector Embeddings (SBERT) to mathematically compare profiles against job descriptions.
- 💡 **Smart Recommendations**: Generates personalized learning roadmaps and role suggestions using Llama-3 (via Groq).

---

## 🗺️ User Journey

**Upload Resume → Parsed Skills Verification → Search Jobs (Multi-Platform) → View Match Scores → Analyze Skill Gaps → Generate Learning Roadmap → Apply with Confidence**

The journey transforms the job search from a guessing game into a science. Users upload their resume, instantly see how an AI interprets their profile, and then launch a cross-platform search. The system scores every job based on *semantic* fit, not just keyword matching, and offers a tailored 3-month plan to close any skill gaps.

---

## 📁 Project Structure

```
SkillFit-AI/
├── 🎨 Frontend/           # React application (Vite + Tailwind)
│   ├── src/components/   # Reusable UI components (Shadcn UI)
│   ├── src/pages/        # Dashboard, Job Search, History pages
│   ├── src/services/     # API integration (Axios)
│   └── dist/             # Production build artifacts
├── ⚙️ Backend/            # FastAPI Server (Python)
│   ├── app/api/          # REST Endpoints
│   ├── app/services/     # Orchestration Logic
│   └── app/models/       # Pydantic Schemas
├── 🧠 ML/                # Machine Learning Engine
│   ├── ner/              # SpaCy Named Entity Recognition
│   ├── embeddings/       # SentenceTransformers Vectorization
│   └── data/             # Skill aliases and normalization maps
├── 🕷️ Scraper/           # Job Gathering Engine
│   ├── linkedin.py       # LinkedIn Scraper
│   ├── Indeed.py         # Indeed Scraper
│   └── Glassdoor.py      # Playwright-based Glassdoor Scraper
```

---

## 🛠️ Built With

Here are the major tools and technologies used to build SkillFit AI:

### 🧩 Backend & AI
![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?style=flat&logo=FastAPI&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB.svg?style=flat&logo=Python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00.svg?style=flat&logo=TensorFlow&logoColor=white)
![Spacy](https://img.shields.io/badge/SpaCy-09A3D5.svg?style=flat&logo=spaCy&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C.svg?style=flat&logo=LangChain&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57.svg?style=flat&logo=SQLite&logoColor=white)

### ⚙️ Frontend
![React](https://img.shields.io/badge/React-61DAFB.svg?style=flat&logo=React&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF.svg?style=flat&logo=Vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)

---

## 📖 Documentation

### **Detailed Documentation**
- [🧠 ML Engine Documentation](./ml/README.md) - Deep dive into NER, Vector Embeddings, and Cross-Encoders.
- [🕷️ Scraper Documentation](./scraper/README.md) - How the multi-platform scraping orchestration works.
- [⚙️ Backend Documentation](./backend/README.md) - API architecture and endpoints.
- [🎨 Frontend Documentation](./frontend/README.md) - UI components and dashboard logic.

### **Key Features Documentation**
- [🔍 Semantic Matching](./ml/README.md#2-semantic-vector-engine-embeddings) - How we measure job fit mathematically.
- [🤖 Resume Parsing](./ml/README.md#1-resume-parsing--skill-extraction-ner) - The hybrid AI + Dictionary parsing system.
- [🕸️ Anti-Bot Scraping](./scraper/README.md#anti-bot-resilience) - Techniques used to bypass rate limits.

---

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Saishhhhhh/SkillFit-AI.git
    cd SkillFit-AI
    ```

2.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    playwright install  # Required for scrapers
    ```

3.  **Run the Backend**:
    ```bash
    cd backend
    uvicorn app.main:app --reload
    ```

4.  **Run the Frontend**:
    Open a new terminal and run:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

<div align="center">

**Built with ❤️ by Saish**

</div>
