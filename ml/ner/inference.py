import os
import json
import logging
import spacy
from huggingface_hub import snapshot_download
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

SKILLS_JSON_PATH = os.path.join(os.path.dirname(__file__), "tech_skills.json")


class TwoLayerExtractor:
    """
    Two-layer skill extraction system (Lightweight & Fast):
    
    1.  **AI Layer**: `amjad-awad/skill-extractor` (SpaCy model).
    2.  **Dictionary Layer**: `tech_skills.json` (Exact match).
    """

    def __init__(self):
        self.nlp = None
        self._model_loaded = False

    def load_model(self):
        """Load the SpaCy model and add the Dictionary Layer."""
        if self._model_loaded:
            return

        try:
            # 1. Load the AI Model
            logger.info("Loading AI Skill Model...")
            model_path = snapshot_download("amjad-awad/skill-extractor", repo_type="model")
            self.nlp = spacy.load(model_path)
            
            # 2. Add the Dictionary Layer
            logger.info("Loading Skill Dictionary...")
            self._attach_dictionary_layer()
            
            self._model_loaded = True
            logger.info("Model loaded successfully.")

        except Exception as e:
            logger.error(f"Model load failed: {e}")
            self.nlp = None

    def _attach_dictionary_layer(self):
        """
        Injects the dictionary matcher into the SpaCy pipeline.
        """
        if not self.nlp: return

        # Load skills from JSON
        try:
            with open(SKILLS_JSON_PATH, "r", encoding="utf-8") as f:
                skill_terms = json.load(f).get("skills", [])
        except Exception:
            return

        if not skill_terms: return

        # Add the 'EntityRuler' pipe (fast dictionary matcher)
        ruler = self.nlp.add_pipe("entity_ruler", before="ner", config={"overwrite_ents": False})
        
        patterns = [
            {"label": "SKILL", "pattern": [{"LOWER": w.lower()} for w in term.split()]}
            for term in skill_terms
        ]
        ruler.add_patterns(patterns)

    def extract_skills(self, text: str) -> Dict[str, Any]:
        #Loading Model
        self.load_model()
        
        return {
            "skills": self._run_pipeline(text),
            "experience": self._find_experience(text)
        }

    def _run_pipeline(self, text: str) -> List[str]:
        if not self.nlp: return []

        try:
            doc = self.nlp(text)
            skills = set()

            for ent in doc.ents:
                if ent.label_ in ["SKILL", "SKILLS", "PRODUCT", "ORG"]:
                
                    clean = ent.text.strip().strip(".,;:()")
                    
                    if len(clean) >= 2 and not clean.replace(" ", "").isdigit():
                        skills.add(clean)

            return sorted(skills, key=str.lower)
        except Exception:
            return []

    def _find_experience(self, text: str) -> Dict[str, Any]:
        #Not Using Anymore
        import re
        patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)',
            r'(?:experience|exp)\s*(?:of|:)?\s*(\d+)\+?\s*(?:years?|yrs?)',
            r'over\s+(\d+)\s+(?:years?|yrs?)'
        ]

        text_lower = text.lower()
        years = []

        for p in patterns:
            matches = re.findall(p, text_lower)
            years.extend([int(m) for m in matches if m.isdigit()])

        if years:
            max_years = max(years)
            return {"total_years": max_years, "summary": f"{max_years}+ years of experience"}
        
        return {"total_years": None, "summary": "Not detected"}


# Main Call
resume_parser = TwoLayerExtractor()
