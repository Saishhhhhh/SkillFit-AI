from fastapi import APIRouter, UploadFile, File, HTTPException
import logging

from backend.app.services.resume_service import process_resume

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/upload",
    tags=["Profile"],
    summary="Upload & Parse a Resume PDF",
    description="""
    Upload a PDF resume file. The server will:
    1. Extract raw text using **pdfplumber**.
    2. Run **2-layer skill extraction**:
       - Layer 1: ML-based NER (amjad-awad/skill-extractor)
       - Layer 2: Dictionary matching (1000+ tech terms)
    3. Return a UI-ready JSON with extracted skills.
    """,
)
async def upload_resume(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a .pdf file."
        )

    # Validate file size (max 10MB)
    contents = await file.read()
    max_size = 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 10MB, got {len(contents) / (1024*1024):.1f}MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    try:
        result = process_resume(contents, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Resume processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error during resume processing: {str(e)}")
