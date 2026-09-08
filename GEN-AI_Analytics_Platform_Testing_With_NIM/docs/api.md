# API Reference - GEN-AI Analytics Platform

## Base URL
`/api` (when proxied via App Router or running on `http://localhost:8000`)

---

### 1. Health Check
`GET /api/health`
- **Response**:
```json
{
  "status": "healthy",
  "app_name": "GEN-AI Analytics Platform API",
  "version": "1.0.0",
  "hana_connected": true,
  "ai_core_connected": true
}
```

---

### 2. Executive Dashboard Summary
`GET /api/dashboard`
- **Response**:
Returns aggregated KPIs (`kpis`), monthly revenue trends (`revenue_trend`), regional distributions (`region_breakdown`), country breakdowns, quarterly performance, and top product matrices.

---

### 3. Natural Language Analytics (Text-to-SQL)
`POST /api/analytics`
- **Request**:
```json
{
  "query": "Show total sales revenue by region ordered from highest to lowest",
  "chart_type": "auto"
}
```
- **Response**:
```json
{
  "query": "...",
  "generated_sql": "SELECT REGION, SUM(TOTAL_REVENUE) FROM SALES_ANALYTICS GROUP BY REGION...",
  "results": [...],
  "summary_insights": "Executive takeaways...",
  "recommended_chart": "bar"
}
```

---

### 4. GenAI Conversational RAG Chatbot
`POST /api/chat`
- **Request**:
```json
{
  "message": "What was the profit margin in North America?",
  "session_id": "session_123",
  "top_k": 5
}
```
- **Response**:
```json
{
  "reply": "Based on retrieved SAP HANA vector records...",
  "sources": [...],
  "session_id": "session_123"
}
```

---

### 5. File Upload & Vector Ingestion
`POST /api/upload`
- **Body**: `multipart/form-data` with `file` (.xlsx or .csv)
- **Response**: Ingestion status, row count, generated vector embeddings summary.
