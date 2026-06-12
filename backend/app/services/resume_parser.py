import instructor
from groq import Groq

from backend.app.schemas.resume import ResumeExtraction
from backend.app.ml.pdf_extractor import extract_text_from_pdf, segment_sections
from backend.app.ml.skill_extractor import extract_skills_layer1, normalize_skills_layer2

def extract_implicit_skills(resume_text, layer12_skills, groq_key):
    
    # instructor is a cool library that wraps the groq client
    # it forces the ai to return data matching our pydantic shape
    client = instructor.from_groq(Groq(api_key=groq_key))
    
    return client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_model=ResumeExtraction,
        messages=[{
            "role": "user",
            "content": f"""
You are an expert resume analyzer. Analyze this resume text carefully.

Resume text:
{resume_text}

Skills already identified by NER: {layer12_skills}

Your job:
1. Find any additional EXPLICIT skills the NER missed (tools, frameworks, languages)
2. Find IMPLICIT skills suggested by context — what did this person actually DO?
   Example: "built semantic search over documents" implies RAG, Vector Databases
   Example: "optimized transformer inference latency" implies Model Optimization
3. For EVERY skill (both NER-found and newly discovered), find the exact line 
   in the resume that proves this person has that skill
4. Extract all experience bullet points and project descriptions verbatim
5. Extract education details

Be thorough but accurate. Don't hallucinate skills that aren't supported by the text.
"""
        }]
    )

def tag_skill_credibility(skill, skill_to_evidence, sections, implicit_skills):
    
    # if the ai specifically called it out as an implied skill, tag it as such
    for implied_skill in implicit_skills:
        
        if skill.lower() == implied_skill.lower():
            return "implicit"
    
    # see if we have a sentence from the resume proving they know this skill
    evidence = skill_to_evidence.get(skill, "")
    
    if not evidence:
        return "listed"
    
    # check if they actually used it in a job or project, not just in a list of skills
    experience_text = sections.get("experience", "").lower()
    projects_text = sections.get("projects", "").lower()
    evidence_lower = evidence.lower()
    
    if evidence_lower in experience_text or evidence_lower in projects_text:
        return "demonstrated"
    
    return "listed"

def full_parse_pipeline(file_bytes, groq_key):
    
    # this orchestrates everything: pdf -> text -> skills -> ai -> tags
    raw_text = extract_text_from_pdf(file_bytes)
    sections = segment_sections(raw_text)
    
    # find skills using our huggingface model and clean up the names
    raw_skills = extract_skills_layer1(raw_text)
    normalized_skills = normalize_skills_layer2(raw_skills)
    
    # pass everything to groq to find hidden skills and structured sections
    llm_result = extract_implicit_skills(raw_text, normalized_skills, groq_key)
    
    # mash all the lists together
    all_explicit = list(set(normalized_skills + llm_result.explicit_skills))
    all_implicit = llm_result.implicit_skills
    all_skills = list(set(all_explicit + all_implicit))
    
    # figure out how credible each skill is based on where it appears
    credibility_tags = {}
    
    for skill in all_skills:
        
        credibility_tags[skill] = tag_skill_credibility(
            skill,
            llm_result.skill_to_evidence,
            sections,
            all_implicit
        )
    
    # convert the pydantic objects into normal dictionaries so they become json later
    project_dicts = []
    
    for project in llm_result.projects:
        project_dicts.append(project.model_dump())
        
    education_dicts = []
    
    for school in llm_result.education:
        education_dicts.append(school.model_dump())
    
    # bundle everything up into a clean json dictionary for the frontend
    return {
        "raw_text": raw_text,
        "sections": sections,
        "skills": {
            "all": sorted(all_skills),
            "explicit": sorted(all_explicit),
            "implicit": sorted(all_implicit),
            "credibility": credibility_tags,
        },
        "evidence": llm_result.skill_to_evidence,
        "experience_bullets": llm_result.experience_bullets,
        "projects": project_dicts,
        "education": education_dicts,
    }
