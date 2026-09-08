from typing import List
from api.services.ai_core_service import ai_core_service

class EmbeddingService:
    def get_embedding(self, text: str) -> List[float]:
        return ai_core_service.generate_embedding(text)

    def batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        return [self.get_embedding(t) for t in texts]

embedding_service = EmbeddingService()
