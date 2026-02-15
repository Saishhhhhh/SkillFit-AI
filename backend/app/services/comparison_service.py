import logging
from typing import Dict, Any, List
from ml.embeddings.vectorizer import cross_encoder_engine
from backend.app.services.genai_service import GenAIService, ModelProvider
from backend.app.db.crud import get_profile

logger = logging.getLogger(__name__)

def run_deep_dive_comparison(resume_text: str = None, jd_text: str = None, api_key: str = None, profile_id: str = None) -> Dict[str, Any]:

    # Perform a high-precision comparison.

    if profile_id:
        profile = get_profile(profile_id)
        if profile and profile.get("raw_text"):
            resume_text = profile.get("raw_text")

    if not resume_text:
        raise ValueError("Resume text is required")

    # 1. Cross-Encoder Scoring (Query: JD, Document: Resume)
    logger.info(f"Running Cross-Encoder Deep Dive. Resume length: {len(resume_text)}, JD length: {len(jd_text)}")
    scores = cross_encoder_engine.predict([(jd_text, resume_text)])
    ce_confidence = round(scores[0], 1)

    # 2. LLM Gap Analysis
    logger.info("Triggering LLM Gap Analysis...")
    genai = GenAIService(api_key=api_key, provider=ModelProvider.GROQ)
    analysis = genai.analyze_match_gap(resume_text, jd_text)

    return {
        "cross_encoder_score": ce_confidence,
        "match_score": ce_confidence,
        "score": ce_confidence,
        "llm_analysis": analysis.dict(),
        "resume_text": resume_text,
        "jd_text": jd_text
    }
