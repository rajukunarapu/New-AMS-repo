from api.services.ai_core_service import ai_core_service
from api.utils.helpers import sanitize_sql_query

class SQLGenerator:
    def generate_sql(self, natural_language_query: str) -> str:
        prompt = f"Convert to SAP HANA SQL for table SALES_ANALYTICS: {natural_language_query}"
        raw_sql = ai_core_service.generate_completion(prompt)
        return sanitize_sql_query(raw_sql)

sql_generator = SQLGenerator()
