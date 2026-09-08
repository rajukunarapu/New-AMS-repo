from typing import List, Dict, Any
import json

class RAGPromptBuilder:
    def build_prompt(self, user_message: str, context_chunks: List[Dict[str, Any]]) -> str:
        formatted_chunks = []
        for c in context_chunks:
            text = c.get('TEXT_CHUNK', '')
            metadata_raw = c.get('METADATA')
            meta_str = ""
            if metadata_raw:
                try:
                    if isinstance(metadata_raw, str):
                        meta = json.loads(metadata_raw)
                    else:
                        meta = metadata_raw
                    source = meta.get('source', '')
                    sheet = meta.get('sheet', '')
                    if source or sheet:
                        meta_str = f" [Source: {source or 'N/A'}, Sheet: {sheet or 'N/A'}]"
                except Exception:
                    pass
            formatted_chunks.append(f"-{meta_str} {text}")

        context_str = "\n".join(formatted_chunks)
        prompt = f"""You are an expert RAG (Retrieval-Augmented Generation) assistant and executive enterprise analytics AI.
Your goal is to extract as much relevant and reliable information as possible from the retrieved knowledge base/context while maintaining 100% factual grounding.

### Instructions:
1. **Primary & Authoritative Source**: Use the retrieved context as the primary and authoritative source.
2. **Comprehensive Coverage**: Consider ALL relevant chunks/documents, not just the first or most obvious matches.
3. **No Omission of Key Evidence**: Do not omit relevant details, including definitions, facts, numbers, statistics, dates, names, conditions, exceptions, procedures, examples, and relationships.
4. **Cross-Document Synthesis**: Combine information across multiple retrieved chunks when they refer to the same topic.
5. **Strict Grounding (No Hallucinations)**: Preserve the exact meaning of the source. Do not invent, assume, extrapolate, or fill gaps with unsupported general knowledge.
6. **Explicit Discrepancies**: If multiple sources provide different information, report the discrepancy explicitly rather than silently choosing one.
7. **Sufficient Information Check**: If the retrieved context does not contain the answer, say: "The retrieved knowledge base does not contain sufficient information to answer this."
8. **Clarity of Evidence**: Distinguish clearly between information explicitly stated, logically derived, and missing.
9. **Executive Presentation Polish**:
   - Provide a direct, business-ready executive response first.
   - Structure explanations using bold section headers (e.g., ### Key Insights, ### Performance Breakdown, ### Strategic Takeaways).
   - Use Markdown tables when presenting comparative figures, category breakdowns, or quarterly metrics.
   - Bold key metrics, monetary values, percentages, and entity names (e.g., **$14.2M**, **+18.4%**).

RETRIEVED RAG CONTEXT:
{context_str}

USER QUERY:
{user_message}

Executive Response:
"""
        return prompt

prompt_builder = RAGPromptBuilder()
