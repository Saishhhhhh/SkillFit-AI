
# SkillStandardizer


import json
import os
import logging
from typing import List, Dict, Set

logger = logging.getLogger(__name__)

class SkillStandardizer:
    def __init__(self, alias_file_path: str = None):
        if alias_file_path is None:
            # Default to ml/data/tech_aliases.json
            current_dir = os.path.dirname(os.path.abspath(__file__))
            alias_file_path = os.path.join(current_dir, "../data/tech_aliases.json")
        
        self.alias_map: Dict[str, str] = {}
        self.canonical_set: Set[str] = set()
        self._load_aliases(alias_file_path)

    def _load_aliases(self, path: str):
        try:
            if not os.path.exists(path):
                logger.warning(f"Alias file not found at {path}. Standardizer will only lowercase.")
                return

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            for item in data.get("technologies", []):
                canonical = item["canonical"].lower().strip()
                self.canonical_set.add(canonical)
                
                # Map canonical to itself (just in case)
                self.alias_map[canonical] = canonical
                
                # Map all aliases to canonical
                for alias in item.get("aliases", []):
                    clean_alias = alias.lower().strip()
                    self.alias_map[clean_alias] = canonical
                    
            logger.info(f"Loaded {len(self.alias_map)} skill aliases from {path}")
            
        except Exception as e:
            logger.error(f"Failed to load skill aliases: {e}")

    def standardize(self, skills: List[str]) -> List[str]:
        if not skills:
            return []
            
        standardized = set()
        
        for skill in skills:
            if not skill:
                continue
                
            clean_skill = skill.lower().strip()
            
            # Check mapping
            if clean_skill in self.alias_map:
                standardized.add(self.alias_map[clean_skill])
            else:
                # If no mapping, just keep the clean version
                standardized.add(clean_skill)
                
        return sorted(list(standardized))

try:
    standardizer = SkillStandardizer()
except Exception as e:
    logger.error(f"Could not initialize global standardizer: {e}")
    standardizer = None
