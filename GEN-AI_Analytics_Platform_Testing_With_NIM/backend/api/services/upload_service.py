import io
import os
from pathlib import Path
import pandas as pd
from typing import Dict, Any
from api.utils.logger import get_logger
from api.services.excel_dataset_service import excel_dataset_service
from api.services.data_service import data_service

logger = get_logger("services.upload_service")

class UploadService:
    def __init__(self):
        # Resolve output directory to backend/preprocessing/output
        self.output_dir = Path(__file__).resolve().parent.parent.parent / "preprocessing" / "output"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def process_file(self, content: bytes, filename: str) -> Dict[str, Any]:
        logger.info(f"Processing and saving uploaded dataset file: {filename}")
        try:
            # 1. Save uploaded file with its original name in backend/preprocessing/output/
            target_path = self.output_dir / filename
            with open(target_path, "wb") as f:
                f.write(content)
            logger.info(f"Saved uploaded file to: {target_path}")

            # 2. Parse file into DataFrame to validate and extract row count
            if filename.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content))
            
            # 3. Always save/overwrite SAC_Sales_Preprocessed.xlsx so the entire platform's default pipeline is updated
            standard_target = self.output_dir / "SAC_Sales_Preprocessed.xlsx"
            if filename.lower() == "sac_sales_preprocessed.xlsx":
                # Already saved above
                pass
            elif filename.lower().endswith((".xlsx", ".xls")):
                with open(standard_target, "wb") as f:
                    f.write(content)
            elif filename.lower().endswith(".csv"):
                df.to_excel(standard_target, index=False)
            
            rows_processed = len(df)
            logger.info(f"Successfully wrote {rows_processed} records to {standard_target}")
            
            # 4. Update cached dataset in memory so queries & dashboard immediately reflect new data
            excel_dataset_service._df = df
            excel_dataset_service._default_path = standard_target
            data_service._df = df
            logger.info(f"Updated in-memory dataset cache with {rows_processed} rows from {standard_target}")

            return {
                "filename": filename,
                "rows_processed": rows_processed,
                "embeddings_generated": rows_processed,
                "status": "success",
                "message": f"Successfully stored dataset in backend/preprocessing/output/SAC_Sales_Preprocessed.xlsx ({rows_processed} records)."
            }
        except Exception as e:
            logger.error(f"Error processing and saving upload file {filename}: {e}")
            return {
                "filename": filename,
                "rows_processed": 0,
                "embeddings_generated": 0,
                "status": "error",
                "message": f"Failed to save and parse file: {str(e)}"
            }

upload_service = UploadService()

