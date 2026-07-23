# API Reference — Enterprise PQC Migration Sequencing Engine

## Base URL

```
http://localhost:8000/api
```

## Authentication

Not yet implemented. All endpoints are currently unauthenticated.

---

## Endpoints

### Health Check

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

### Enterprise Discovery

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/discover` | Run enterprise cryptographic asset discovery |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

### Benchmark

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/benchmark` | Run PQC algorithm benchmarks |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

### Compatibility

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/compatibility` | Analyze PQC compatibility |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

### Migration Planner

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/planner` | Generate migration execution plan |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

### Deployment Report

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/report` | Retrieve deployment report |

**Response:**
```json
{
    "status": "Not Implemented"
}
```

---

## Error Handling

All errors follow standard HTTP status codes with JSON error bodies:

```json
{
    "detail": "Error description"
}
```

## OpenAPI Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
