from fastapi import APIRouter, UploadFile, File, HTTPException
from api.models.response_models import UploadResponse
from api.services.upload_service import upload_service
from api.utils.validation import validate_excel_file

router = APIRouter(prefix="/api/upload", tags=["Upload"])

@router.post("", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    validate_excel_file(file.filename)
    try:
        content = await file.read()
        res = upload_service.process_file(content, file.filename)
        return UploadResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
