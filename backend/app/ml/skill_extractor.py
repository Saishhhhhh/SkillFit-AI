import json
import os
from transformers import pipeline

# we load the model once when the file runs, so we don't have to reload it for every single resume
# this specific model is trained just to find skill words in text
skill_pipeline = pipeline(
    "token-classification",
    model="algiraldohe/lm-ner-linkedin-skills-recognition",
    aggregation_strategy="simple"
)

alias_map = {}

def load_alias_map(path):
    
    # this turns our json file of aliases into a simple python dictionary
    # so we can easily look up if "k8s" should actually be "kubernetes"
    lookup = {}
    
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    for entry in data.get("technologies", []):
        
        canonical = entry["canonical"]
        lookup[canonical.lower()] = canonical
        
        for alias in entry.get("aliases", []):
            
            lookup[alias.lower()] = canonical
            
    return lookup

# doing a little path magic to find our json file since it lives 3 folders up
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
alias_path = os.path.join(project_root, "data", "skill_aliases.json")

if os.path.exists(alias_path):
    alias_map = load_alias_map(alias_path)
    print(f"loaded {len(alias_map)} alias mappings")
else:
    print(f"warning: alias file not found at {alias_path}")


def extract_skills_layer1(text):
    
    # the ai model can crash if we feed it too much text at once, 
    # so we chop the text into 512-character chunks
    max_chunk_length = 512
    chunks = []
    
    # loop through the text and slice it into pieces
    for i in range(0, len(text), max_chunk_length):
        
        piece = text[i : i + max_chunk_length]
        chunks.append(piece)
    
    all_skills = []
    
    for chunk in chunks:
        
        results = skill_pipeline(chunk)
        
        for result in results:
            
            # score > 0.5 means the ai is reasonably confident it found a skill
            if result["score"] > 0.5:
                skill = result["word"].strip()
                # ignore anything too short or insanely long
                if 2 <= len(skill) <= 50:
                    all_skills.append(skill)
    
    return all_skills

def normalize_skills_layer2(raw_skills):
    
    # take the messy raw skills and clean them up using our dictionary
    normalized = set()
    
    for skill in raw_skills:
        
        canonical = alias_map.get(skill.lower(), skill)
        normalized.add(canonical)
    
    return sorted(normalized)

def extract_skills_from_text(text):
    
    # this combines both steps: find the skills, then clean them up
    raw = extract_skills_layer1(text)
    return normalize_skills_layer2(raw)
