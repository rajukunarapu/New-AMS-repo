# System Architecture - GEN-AI Analytics Platform

## Technical Stack Overview

- **Frontend**: React (Vite + TypeScript), Tailwind Tokens, SVG Custom Micro-animations, Lucide Icons.
- **Backend API**: Python FastAPI exposing RESTful endpoints for RAG, Text-to-SQL, data processing.
- **Database Layer**: SAP HANA Cloud Instance (`SALES_ANALYTICS` table + `VECTOR_TABLE` for `REAL_VECTOR(1536)` embeddings).
- **Generative AI Core**: SAP AI Core (Token authentication, LLM completions, text embeddings).
- **Security & Infrastructure**: SAP BTP Cloud Foundry, App Router (`@sap/approuter`), XSUAA placeholder (`xs-security.json`).

## Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              React SPA (Vite + TS)                                |
|             [Dashboard] | [Analytics NL-SQL] | [GenAI Chatbot] | [Upload]           |
+-----------------------------------------------------------------------------------+
                                         |
                                (HTTP / REST API)
                                         v
+-----------------------------------------------------------------------------------+
|                            SAP App Router / FastAPI                               |
|  /api/dashboard  |  /api/analytics  |  /api/chat  |  /api/upload  |  /api/health    |
+-----------------------------------------------------------------------------------+
      |                                  |                                   |
      v                                  v                                   v
+-------------------+          +-------------------+               +-------------------+
|  FastAPI Routes   |          |    RAG Engine     |               |  SAP AI Core API  |
|  Services Layer   |--------->|  Vector Ingestion |-------------->| Token Auth / LLM  |
+-------------------+          +-------------------+               +-------------------+
      |                                  |
      +----------------------------------+
                                         |
                                         v
                       +-----------------------------------+
                       |          SAP HANA Cloud           |
                       |  - SALES_ANALYTICS (Tables/Views) |
                       |  - VECTOR_TABLE (REAL_VECTOR)     |
                       +-----------------------------------+
```
