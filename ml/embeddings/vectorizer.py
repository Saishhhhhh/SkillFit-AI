"""
Vector Engine — ML Layer for generating text embeddings.

Uses 'sentence-transformers/all-MiniLM-L6-v2' (~80MB, 384 dimensions).
Handles text cleaning and batch encoding.
"""

import os
os.environ["USE_TF"] = "0"  # Prevent transformers from importing TensorFlow

import re
import unicodedata
import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

logger = logging.getLogger(__name__)


class VectorEngine:
    #wrapper around the Sentence Transformer model.

    def __init__(self):
        self.model = None
        self._loaded = False

    def load_model(self):
        #Lazy-load the embedding model.
        if self._loaded:
            return

        try:
            logger.info("Loading embedding model (all-MiniLM-L6-v2)...")
            self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            self._loaded = True
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.model = None

    @staticmethod
    def clean_text(text: str) -> str:
        if not text or text == "N/A":
            return ""

        try:
            text = text.encode('utf-8').decode('unicode_escape')
        except Exception:
            pass 

        text = unicodedata.normalize("NFKD", text)

        text = text.replace("\u20b9", "Rs")  # Rupee -> Rs
        text = text.replace("\u2013", "-")   # En-dash -> hyphen
        text = text.replace("\u2014", "-")   # Em-dash -> hyphen

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)

        # Lowercase
        text = text.lower()

        # Replace all whitespace (newlines, tabs, non-breaking spaces) with a single space
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def encode(self, text: str) -> List[float]:
        #Encode a single text string into a 384-dim vector.
        self.load_model()
        if not self.model:
            return [0.0] * 384

        cleaned = self.clean_text(text)
        if not cleaned:
            return [0.0] * 384

        vector = self.model.encode(cleaned, normalize_embeddings=True)
        return vector.tolist()

    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        #Encode multiple texts at once 
        self.load_model()
        if not self.model:
            return [[0.0] * 384] * len(texts)

        cleaned = [self.clean_text(t) for t in texts]
        # Replace empty strings with a placeholder to avoid errors
        cleaned = [t if t else "empty" for t in cleaned]

        vectors = self.model.encode(cleaned, normalize_embeddings=True, batch_size=32)
        return vectors.tolist()

#Main Call
vector_engine = VectorEngine()
