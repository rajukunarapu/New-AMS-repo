from typing import List, Dict, Any
from api.services.hana_service import hana_service

class SQLExecutor:
    def execute(self, sql_query: str) -> List[Dict[str, Any]]:
        return hana_service.execute_custom_sql(sql_query)

sql_executor = SQLExecutor()
