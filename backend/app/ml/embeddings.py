import io
import os
import numpy as np
from sentence_transformers import SentenceTransformer

# load the model once when the file runs. it takes a few seconds to load
# so we definitely don't want to do this every time someone uploads a resume.
sbert_model = SentenceTransformer("all-MiniLM-L6-v2")

S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "skillfit-ai-embeddings")

def embed_text(text):
    
    # converts any text into a list of 384 numbers (a vector)
    # similar texts will give similar numbers, which is how we match things!
    return sbert_model.encode(text, normalize_embeddings=True)

def cosine_similarity(a, b):
    
    # checks how similar two vectors are.
    # returns a score from 0.0 (completely different) to 1.0 (exact match)
    return float(np.dot(a, b))

def save_embedding_s3(embedding, key):
    
    # saves the array of numbers to our aws s3 bucket
    import boto3
    
    s3 = boto3.client("s3")
    
    buf = io.BytesIO()
    np.save(buf, embedding)
    buf.seek(0)
    
    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.read())
    
    return key

def load_embedding_s3(key):
    
    # pulls the array of numbers back down from aws s3
    import boto3
    
    s3 = boto3.client("s3")
    
    obj = s3.get_object(Bucket=S3_BUCKET, Key=key)
    
    return np.load(io.BytesIO(obj["Body"].read()))
