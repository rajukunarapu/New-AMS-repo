import os
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from api.utils.logger import get_logger

logger = get_logger("services.excel_dataset_service")

class ExcelDatasetService:
    def __init__(self):
        self._df: Optional[pd.DataFrame] = None
        # Base path pointing to preprocessing/output/SAC_Sales_Preprocessed.xlsx
        self._default_path = Path(__file__).resolve().parent.parent.parent / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx"

    def _resolve_dataset_path(self) -> Path:
        candidates = [
            self._default_path,
            Path(__file__).resolve().parent.parent.parent / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx",
            Path.cwd() / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx",
            Path.cwd() / "backend" / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return self._default_path

    def get_df(self) -> pd.DataFrame:
        if self._df is None:
            resolved_path = self._resolve_dataset_path()
            if not resolved_path.exists():
                logger.error(f"Excel dataset not found at {resolved_path}")
                raise FileNotFoundError(f"Dataset file not found at {resolved_path}")
            
            self._default_path = resolved_path
            logger.info(f"Loading preprocessed Excel dataset from: {self._default_path}")
            self._df = pd.read_excel(self._default_path)
            logger.info(f"Dataset loaded successfully with shape {self._df.shape}")
        return self._df

    def get_dataset_path(self) -> Path:
        return self._resolve_dataset_path()

    def get_fast_dataset_path(self) -> Path:
        return self._resolve_dataset_path()

    def parse_dataset(self, file_path: str) -> Dict[str, Any]:
        df = self.get_df()
        return {
            "status": "success",
            "file_path": str(self._default_path),
            "rows": len(df),
            "columns": df.columns.tolist()
        }

excel_dataset_service = ExcelDatasetService()
