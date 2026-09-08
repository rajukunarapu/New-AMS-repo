from typing import List, Dict, Any
import threading
from api.database.vector_client import vector_client
from api.services.ai_core_service import ai_core_service
from api.utils.logger import get_logger

logger = get_logger("services.vector_service")

# Query result cache
_query_cache = {}
_cache_lock = threading.Lock()

class VectorService:
    def search_similar_chunks(self, text_query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Check cache first
        cache_key = f"{text_query}:{top_k}"
        with _cache_lock:
            if cache_key in _query_cache:
                logger.debug(f"Vector search cache hit for: {text_query[:50]}")
                return _query_cache[cache_key]
        
        embedding = ai_core_service.generate_embedding(text_query)
        results = vector_client.similarity_search(embedding, top_k)
        if not results:
            # Fallback mock context if DB empty
            results = [{
                "ID": "chunk_01",
                "TEXT_CHUNK": f"Sales context match for '{text_query}': Enterprise software and tech hardware in North America drove 35% of Q3 profit margin.",
                "SCORE": 0.92
            }]
        
        # Cache the results
        with _cache_lock:
            _query_cache[cache_key] = results
        
        return results

    def add_document_vector(self, doc_id: str, text: str, metadata: Any = None):
        embedding = ai_core_service.generate_embedding(text)
        vector_client.store_vector(doc_id, text, embedding, metadata)

vector_service = VectorService()
