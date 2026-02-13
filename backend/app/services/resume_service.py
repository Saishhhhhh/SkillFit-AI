import pdfplumber
import logging
import io
from typing import Dict, Any
from ml.ner.inference import resume_parser

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract raw text from a PDF file using pdfplumber.
    Accepts raw bytes (from UploadFile.read()).
    """
    full_text = ""

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
                else:
                    logger.warning(f"Page {i+1}: No text extracted (may be image-based)")
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise ValueError(f"Could not read the PDF file: {e}")

    if not full_text.strip():
        raise ValueError("No text could be extracted from the PDF. It might be image-based or corrupted.")

    return full_text.strip()


def process_resume(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Resume processing pipeline:
    1. Extract text from PDF
    2. Run 2-layer skill extraction (NER + Dictionary)
    3. Return UI-ready JSON (NO vectors — user confirms skills first)
    """
    logger.info(f"Processing resume: {filename}")

    # Step 1: Extract text
    raw_text = extract_text_from_pdf(file_bytes)

    # Step 2: Run ML inference (skills + experience)
    result = resume_parser.extract_skills(raw_text)

    # Step 3: Build UI-ready response (vectors generated later via /embed)
    return {
        "filename": filename,
        "raw_text": raw_text,
        "skills": [
            {"name": skill, "confirmed": False}
            for skill in result["skills"]
        ],
        "experience": result["experience"],
        "metadata": {
            "text_length": len(raw_text),
            "skills_count": len(result["skills"]),
            "model": "amjad-awad/skill-extractor + EntityRuler",
        }
    }
