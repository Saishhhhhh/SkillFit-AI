
# SkillFit AI - The Intelligence Layer 🧠

This module is the core differentiation engine of SkillFit AI. While the backend handles requests and the scraper fetches data, **this ML module understands it**.

It transforms unstructured resume PDFs and messy job descriptions into **structured semantic vectors** and **normalized skills**, enabling "Google-like" matching for career insights.

## 🚀 Key Components

### 1. 🔍 Resume Parsing & Skill Extraction (NER)
Located in `ml/ner/`.

We use a **Hybrid Two-Pass System** for maximum accuracy:
1.  **AI Pass (Contextual)**: Uses a fine-tuned technical **spaCy** model (`amjad-awad/skill-extractor`) to detect skills based on sentence context (e.g., differentiating "Java" the language from "Java" the island).
2.  **Dictionary Pass (Certainty)**: Runs against a curated list of ~22,000 tech terms (`tech_skills.json`) to catch niche frameworks the AI might miss (e.g., "Prisma", "tRPC").

**Why?** Pure AI misses new tools. Pure Regex misses context. Hybrid catches both.

### 2. 📐 Semantic Vector Engine (Embeddings)
Located in `ml/embeddings/`.

*   **Model**: `sentence-transformers/all-MiniLM-L6-v2`
*   **Dimensionality**: 384-dimensional dense vectors.
*   **Function**: 
    *   Converts your ENTIRE resume into a single mathematical vector.
    *   Converts EVERY job description into a vector.
    *   Example: A resume with "Flask" will be mathematically close to a job asking for "Django" because the model understands they are both Python web frameworks.
*   **Metric**: Cosine Similarity (Scores match quality from 0.0 to 1.0).

### 3. 🎯 Deep-Dive Re-Ranking (Cross-Encoder)
Located in `ml/embeddings/vectorizer.py`.

*   **Model**: `cross-encoder/ms-marco-MiniLM-L-6-v2`
*   **Purpose**: The "Final Judge" for top job matches.
*   **Mechanism**: Unlike semantic search (which compares two separate vectors), the Cross-Encoder takes the Resume + Job Description as a **single input pair** and outputs a direct relevancy score.
*   **Accuracy**: Extremely high. It can tell if you have "5 years of Python" vs "1 year of Python", which simple vector search might miss.

### 4. 🧹 Skill Standardization
Located in `ml/utils/skill_standardizer.py`.

*   **Problem**: Resumes say "ReactJS", jobs say "React.js", recruiters say "React".
*   **Solution**: A fuzzy-matching normalization engine backed by `tech_aliases.json`.
*   **Outcome**: `ReactJS` == `React.js` == `React` -> One unified tag for analytics.

## 🛠️ Usage Example

The ML pipeline is designed to be modular. To extract skills from raw text:

```python
from ml.ner.inference import resume_parser

text = "Experienced in building scalable APIs using FastAPI and Pydantic."
result = resume_parser.extract_skills(text)

print(result)
# Output:
# {
#   "skills": ["FastAPI", "Pydantic", "API Development"],
#   "experience": "Senior"
# }
```
