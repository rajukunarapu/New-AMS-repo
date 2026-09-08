import logging
import threading
from api.config import settings
from api.utils.logger import get_logger

logger = get_logger("database.connection")

try:
    from hdbcli import dbapi
    HDBCLI_AVAILABLE = True
except ImportError:
    HDBCLI_AVAILABLE = False
    logger.warning("hdbcli module not available. HANA connection will operate in mock mode.")

class HANAConnectionManager:
    def __init__(self):
        self.address = settings.HANA_ADDRESS
        self.port = settings.HANA_PORT
        self.user = settings.HANA_USER
        self.password = settings.HANA_PASSWORD
        self._connection_pool = []
        self._pool_lock = threading.Lock()
        self._max_pool_size = 5

    def get_connection(self):
        if not HDBCLI_AVAILABLE:
            return None
        
        # Try to get a connection from the pool
        with self._pool_lock:
            if self._connection_pool:
                conn = self._connection_pool.pop()
                # Test if connection is still alive
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1 FROM DUMMY")
                    cursor.close()
                    return conn
                except Exception:
                    # Connection is dead, create a new one
                    pass
        
        # Create new connection
        try:
            conn = dbapi.connect(
                address=self.address,
                port=self.port,
                user=self.user,
                password=self.password,
                encrypt="true",
                sslValidateCertificate="false"
            )
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to SAP HANA Cloud: {e}")
            return None

    def return_connection(self, conn):
        """Return a connection to the pool"""
        if not conn:
            return
        with self._pool_lock:
            if len(self._connection_pool) < self._max_pool_size:
                self._connection_pool.append(conn)
            else:
                # Pool is full, close the connection
                try:
                    conn.close()
                except Exception:
                    pass

    def is_connected(self) -> bool:
        conn = self.get_connection()
        if conn:
            self.return_connection(conn)
            return True
        return False

db_manager = HANAConnectionManager()
