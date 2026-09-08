from typing import List, Dict, Any, Optional
import json
import threading
from api.database.hana_client import hana_client
from api.utils.logger import get_logger

logger = get_logger("database.vector_client")

# Module-level flag to ensure schema check runs only once per process
_schema_initialized = False
_schema_lock = threading.Lock()

class HANAVectorClient:
    def __init__(self):
        # Initialize schema at startup (runs once per process)
        self._ensure_schema_once()

    def _ensure_schema_once(self):
        global _schema_initialized
        # Thread-safe one-time schema initialization per process
        with _schema_lock:
            if _schema_initialized:
                return
            try:
                # Create VECTOR_TABLE if it doesn't exist
                sql = """
                CREATE COLUMN TABLE VECTOR_TABLE (
                    ID NVARCHAR(100) NOT NULL,
                    TEXT_CHUNK NCLOB,
                    EMBEDDING REAL_VECTOR(1536),
                    METADATA NCLOB,
                    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (ID)
                )
                """
                hana_client.execute_query(sql)
                logger.info("Successfully created VECTOR_TABLE in database")
            except Exception as e:
                # If the table already exists, ignore silently (not a warning)
                if "already exists" not in str(e).lower() and "duplicate table name" not in str(e).lower():
                    logger.warning(f"Could not create VECTOR_TABLE: {e}")
            
            try:
                # Try to add METADATA column if it doesn't exist
                hana_client.execute_query("ALTER TABLE VECTOR_TABLE ADD (METADATA NCLOB)")
                logger.info("Checked and updated VECTOR_TABLE to support METADATA")
            except Exception as e:
                # Column already exists is fine - suppress warning
                if "already exists" not in str(e).lower() and "column name already exists" not in str(e).lower():
                    logger.debug(f"METADATA column check: {e}")
            _schema_initialized = True


    def similarity_search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        # Schema already initialized in __init__, no need to check again
        # Uses SAP HANA Vector Engine COSINE_SIMILARITY
        vector_str = f"'{query_embedding}'"
        sql = f"""
            SELECT TOP {top_k} ID, TEXT_CHUNK, METADATA, COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR({vector_str})) AS SCORE
            FROM VECTOR_TABLE
            ORDER BY SCORE DESC
        """
        try:
            return hana_client.execute_query(sql)
        except Exception as e:
            logger.warning(f"Vector search fallback to mock/empty due to DB state: {e}")
            return []

    def store_vector(self, doc_id: str, text_chunk: str, embedding: List[float], metadata: Optional[Any] = None):
        # Schema already initialized in __init__, no need to check again
        vector_str = str(embedding)
        metadata_str = None
        if metadata is not None:
            if isinstance(metadata, str):
                metadata_str = metadata
            else:
                try:
                    metadata_str = json.dumps(metadata)
                except Exception:
                    metadata_str = str(metadata)

        sql = """
            INSERT INTO VECTOR_TABLE (ID, TEXT_CHUNK, EMBEDDING, METADATA)
            VALUES (?, ?, TO_REAL_VECTOR(?), ?)
        """
        try:
            hana_client.execute_query(sql, (doc_id, text_chunk, vector_str, metadata_str))
        except Exception as e:
            logger.warning(f"Vector store fallback: {e}")

vector_client = HANAVectorClient()
