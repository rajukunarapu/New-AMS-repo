from api.services.ai_core_service import ai_core_service

class RAGGenerator:
    def generate(self, formatted_prompt: str) -> str:
        return ai_core_service.generate_completion(formatted_prompt)

generator = RAGGenerator()
