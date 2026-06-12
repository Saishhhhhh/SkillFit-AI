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

# this is the main shape of the data we expect to get back after
# running a resume through all our ai steps. it forces the ai to
# return a neat json object instead of messy text.
class ResumeExtraction(BaseModel):
    explicit_skills: list[str]
    implicit_skills: list[str]
    skill_to_evidence: dict[str, str]
    experience_bullets: list[str]
    projects: list[ProjectEntry]
    education: list[EducationEntry]
