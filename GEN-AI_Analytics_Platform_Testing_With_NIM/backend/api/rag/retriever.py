from typing import List, Dict, Any
from api.services.vector_service import vector_service

class ContextRetriever:
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        return vector_service.search_similar_chunks(query, top_k)

retriever = ContextRetriever()
