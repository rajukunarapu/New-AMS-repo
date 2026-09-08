# Local Setup & Development Guide

Follow these steps to run the application locally in development mode.

## 1. Clone & Environment Config
```bash
cp .env.example .env
```
Fill in your credentials for SAP AI Core and SAP HANA Cloud in `.env`.

## 2. Python Backend Setup
```bash
cd backend/api
python -m venv venv
# Activate venv (Windows: venv\Scripts\activate, Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
