import re
import pdfplumber
import fitz

def extract_text_from_pdf(file_bytes):
    
    # try pdfplumber first since it keeps the text layout intact better
    text = extract_with_pdfplumber(file_bytes)
    
    if text and len(text.strip()) > 50:
        return text.strip()
    
    # if pdfplumber fails, we fall back to pymupdf which is better for weird pdfs
    text = extract_with_pymupdf(file_bytes)
    
    if text and len(text.strip()) > 50:
        return text.strip()
    
    # if both fail, the pdf is probably just a scanned image
    raise ValueError(
        "could not extract text from this pdf. "
        "it might be a scanned image. please upload a text-based pdf."
    )

def extract_with_pdfplumber(file_bytes):
    
    import io
    
    all_text = []
    
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            
            page_text = page.extract_text()
            if page_text:
                all_text.append(page_text)
    
    return "\n".join(all_text)

def extract_with_pymupdf(file_bytes):
    
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    
    all_text = []
    
    for page in doc:
        
        all_text.append(page.get_text())
        
    doc.close()
    
    return "\n".join(all_text)

def segment_sections(raw_text):
    
    # we use simple regex patterns to guess where a section starts
    # (?i) means case-insensitive
    section_patterns = {
        "education": r"(?i)\b(education|academic|qualification|degree)",
        "experience": r"(?i)\b(experience|employment|work\s*history|professional)",
        "projects": r"(?i)\b(project|portfolio|personal\s*project)",
        "skills": r"(?i)\b(skill|technical\s*skill|core\s*competenc|proficienc)",
        "certifications": r"(?i)\b(certif|license|credential|course|training)",
        "summary": r"(?i)\b(summary|objective|profile|about\s*me|overview)",
    }
    
    lines = raw_text.split("\n")
    sections = {}
    current_section = "other"
    current_lines = []
    
    for line in lines:
        
        stripped = line.strip()
        
        if not stripped:
            current_lines.append("")
            continue
        
        # headers are usually short lines of text
        is_header = len(stripped) < 60
        matched_section = None
        
        if is_header:
            for section_name, pattern in section_patterns.items():
                
                if re.search(pattern, stripped):
                    matched_section = section_name
                    break
        
        if matched_section:
            # save what we have so far into the previous section
            sections[current_section] = "\n".join(current_lines).strip()
            current_section = matched_section
            current_lines = []
        else:
            current_lines.append(stripped)
    
    # save the very last section
    sections[current_section] = "\n".join(current_lines).strip()
    
    # clean out any empty sections (where there is no text)
    final_sections = {}
    
    for section_name, section_text in sections.items():
        
        if section_text:
            final_sections[section_name] = section_text
            
    return final_sections
