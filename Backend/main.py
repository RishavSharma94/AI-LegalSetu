# main.py
import os
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
import uvicorn

# Text extraction libs
from pdfminer.high_level import extract_text
import docx  # python-docx
from io import BytesIO  # Add this import

# Text extraction libs
# import fitz  # PyMuPDF
import fitz  # PyMuPDF
from pdfminer.high_level import extract_text

import docx  # python-docx

# Vector search libs (optional)
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

#-------------newly-------------
def extract_pdf_text(file_path):
    try:
        text = extract_text(file_path)
        return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

# ---------- Load config ----------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")  # change as needed
VECTOR_INDEX_PATH = os.getenv("VECTOR_INDEX_PATH", "faiss_index.bin")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not found — add it to your .env")

openai.api_key = OPENAI_API_KEY

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-legal-assistant")

# ---------- FastAPI app ----------
app = FastAPI(title="AI Legal Assistant Backend")

# Allow CORS from local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # adjust for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Pydantic models ----------
class AskQueryRequest(BaseModel):
    query: str
    use_rag: Optional[bool] = False  # if you want to use retrieval augmentation

class AskQueryResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = None

class ClassifyRequest(BaseModel):
    text: str

class ClassifyResponse(BaseModel):
    category: str
    confidence: Optional[float] = None

# ---------- Simple helper functions ----------
def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF (fitz)."""
    text_parts = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)

# def extract_text_from_docx_bytes(data: bytes) -> str:
#     """Extract text from DOCX bytes using python-docx."""
#     from io import BytesIO
#     doc = docx.Document(BytesIO(data))
#     paragraphs = [p.text for p in doc.paragraphs]
#     return "\n".join(paragraphs)

def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Extract text from PDF bytes using pdfminer."""
    from io import BytesIO
    try:
        # Use pdfminer to extract text from bytes
        text = extract_text(BytesIO(data))
        return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def chunk_text(text: str, max_tokens_chars: int = 4000):
    """Naive chunker based on characters (fast). Tune for tokens in production."""
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = start + max_tokens_chars
        chunks.append(text[start:end])
        start = end
    return chunks

def call_openai_chat(system_prompt: str, user_prompt: str, model: str = OPENAI_MODEL) -> str:
    """
    Simple wrapper for OpenAI chat call.
    NOTE: adapt this to your provider or streaming usage.
    """
    try:
        resp = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        return resp.choices[0].message["content"].strip()
    except Exception as e:
        logger.exception("OpenAI API error")
        raise

# ---------- Endpoints ----------

@app.post("/api/ask-query", response_model=AskQueryResponse)
async def ask_query(req: AskQueryRequest):
    """
    Accepts JSON: { "query": "..." }
    Returns: { "answer": "...", "sources": [...] }
    """
    logger.info("ask-query received")
    try:
        # system prompt tuned for legal assistant (short example)
        system_prompt = (
            "You are LexiBot, a professional AI legal assistant. Provide clear, concise answers, "
            "cite statutes or case names when applicable, and include a short 'notes' section. "
            "When unsure, advise user to consult a qualified lawyer."
        )

        # Optionally: retrieval-augmented generation (RAG)
        if req.use_rag:
            # placeholder: call your retrieval system here and include context
            # e.g., retrieved_context = retrieve_similar_docs(req.query)
            retrieved_context = None
            if retrieved_context:
                user_prompt = f"Context:\n{retrieved_context}\n\nQuestion: {req.query}"
            else:
                user_prompt = req.query
        else:
            user_prompt = req.query

        answer_text = call_openai_chat(system_prompt, user_prompt)
        return {"answer": answer_text, "sources": []}
    except Exception as e:
        logger.exception("Error in /api/ask-query")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/summarize")
async def summarize(file: UploadFile = File(...)):
    """
    Accepts file upload (pdf/docx/txt). Returns JSON with summary.
    """
    logger.info("summarize called: %s", file.filename)
    try:
        content = await file.read()
        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            # Save the uploaded file temporarily
            temp_path = f"temp_{file.filename}"
            with open(temp_path, "wb") as f:
                f.write(content)
            text = extract_pdf_text(temp_path)
            os.remove(temp_path)


        elif filename.endswith(".docx"):
            text = extract_text_from_docx_bytes(content)
        elif filename.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(400, "Unsupported file type. Use pdf/docx/txt.")

        if not text.strip():
            raise HTTPException(400, "No extractable text found in file.")

        # If long, chunk and summarize each chunk then combine
        chunks = chunk_text(text, max_tokens_chars=4000)
        system_prompt = "You are LexiBot, an expert legal summarizer. Produce a concise, structured summary with headings: Summary, Key Clauses, Risks, Recommended Next Steps."
        summaries = []
        for chunk in chunks:
            user_prompt = f"Please summarize the following legal text (preserve headings, bullet key points):\n\n{chunk}"
            s = call_openai_chat(system_prompt, user_prompt)
            summaries.append(s)

        # Optionally combine chunk summaries into a final summary
        if len(summaries) > 1:
            combined_prompt = "Combine the following partial summaries into one concise summary, avoid repetition, and create final Key Clauses and Recommendations:\n\n" + "\n\n---\n\n".join(summaries)
            final_summary = call_openai_chat(system_prompt, combined_prompt)
        else:
            final_summary = summaries[0]

        return {"summary": final_summary}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /api/summarize")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    """
    Classify text into categories: agreement, petition, notice, judgment, other.
    Uses a short LLM prompt or fallback keywords.
    """
    logger.info("classify called")
    try:
        text = req.text
        if not text or not text.strip():
            raise HTTPException(400, "Empty text provided")

        # Try LLM-based classification
        system_prompt = "You are an assistant that classifies legal documents into one of: Agreement, Petition, Notice, Judgment, Other. Respond only with the label and an optional confidence as JSON."
        user_prompt = f"Classify the following document text and return JSON like: {{\"category\":\"Agreement\",\"confidence\":0.92}}\n\nText:\n{text[:3000]}"  # limit length
        try:
            resp_text = call_openai_chat(system_prompt, user_prompt)
            # Try to parse the label out of LLM text simply:
            import json, re
            m = re.search(r"\{.*\}", resp_text, re.S)
            if m:
                parsed = json.loads(m.group(0))
                return {"category": parsed.get("category", "Other"), "confidence": parsed.get("confidence")}
        except Exception:
            logger.warning("LLM classification failed, falling back to keyword rules")

        # Fallback keyword-based classifier
        lower = text.lower()
        if "agreement" in lower or "party" in lower or "witnesseth" in lower:
            category = "Agreement"
        elif "petition" in lower or "petitioner" in lower or "prays" in lower:
            category = "Petition"
        elif "notice" in lower or "hereby notify" in lower or "take notice" in lower:
            category = "Notice"
        elif "judgment" in lower or "judgement" in lower or "order" in lower:
            category = "Judgment"
        else:
            category = "Other"

        return {"category": category, "confidence": 0.6}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /api/classify")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Vector retrieval example ----------------
# Build or load FAISS index using sentence-transformers.
# This is optional. You should pre-build the index from your document corpus
# and save it to VECTOR_INDEX_PATH. Here we demonstrate a simple search flow.

# Lazy-load embedding model and index
_embedding_model = None
_faiss_index = None
_corpus_texts = None  # list of texts corresponding to index vectors

def ensure_vector_index():
    global _embedding_model, _faiss_index, _corpus_texts
    if _embedding_model is None:
        logger.info("Loading embedding model...")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    if _faiss_index is None:
        if os.path.exists(VECTOR_INDEX_PATH):
            logger.info("Loading FAISS index from %s", VECTOR_INDEX_PATH)
            _faiss_index = faiss.read_index(VECTOR_INDEX_PATH)
            # Also expect corpus texts in a parallel .npy or .txt file
            txt_path = VECTOR_INDEX_PATH + ".texts.npy"
            if os.path.exists(txt_path):
                _corpus_texts = np.load(txt_path, allow_pickle=True).tolist()
            else:
                _corpus_texts = []
        else:
            logger.warning("FAISS index not found at %s", VECTOR_INDEX_PATH)
            _faiss_index = None
            _corpus_texts = []

# @app.post("/api/retrieve")
# async def retrieve(query: str = Form(...), top_k: int = Form(5)):
#     """
#     Example retrieval endpoint:
#     - compute embedding for query using sentence-transformers
#     - search faiss index and return top_k matched snippets
#     """
#     try:
#         ensure_vector_index()
#         if _faiss_index is None or not _corpus_texts:
#             return {"results": [], "note": "No index loaded. Build and save FAISS index first."}

#         q_emb = _embedding_model.encode([query])
#         q_emb = np.array(q_emb).astype("float32")
#         D, I = _faiss_index.search(q_emb, top_k)
#         results = []
#         for idx, dist in zip(I[0], D[0]):
#             results.append({"text": _corpus_texts[idx], "score": float(dist)})
#         return {"results": results}
#     except Exception as e:
#         logger.exception("Error in /api/retrieve")
#         raise HTTPException(status_code=500, detail=str(e))

class RetrieveRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

@app.post("/api/retrieve")
async def retrieve(req: RetrieveRequest):
    """
    Example retrieval endpoint:
    - compute embedding for query using sentence-transformers
    - search faiss index and return top_k matched snippets
    """
    try:
        ensure_vector_index()
        if _faiss_index is None or not _corpus_texts:
            return {"results": [], "note": "No index loaded. Build and save FAISS index first."}

        q_emb = _embedding_model.encode([req.query])
        q_emb = np.array(q_emb).astype("float32")
        D, I = _faiss_index.search(q_emb, req.top_k)
        results = []
        for idx, dist in zip(I[0], D[0]):
            results.append({"text": _corpus_texts[idx], "score": float(dist)})
        return {"results": results}
    except Exception as e:
        logger.exception("Error in /api/retrieve")
        raise HTTPException(status_code=500, detail=str(e))
# ---------- Run ----------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
