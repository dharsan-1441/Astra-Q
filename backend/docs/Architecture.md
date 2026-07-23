# Architecture — Enterprise PQC Migration Sequencing Engine

## System Overview

The Enterprise PQC Migration Sequencing Engine is an engineering framework
designed to help enterprises safely migrate their cryptographic infrastructure
to NIST-standardized Post-Quantum Cryptography algorithms (ML-KEM and ML-DSA).

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Dashboard │ │Discovery │ │ Graph    │ │Benchmark │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │Compat.   │ │ Planner  │ │ Report   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                    Material UI + React Flow + Recharts      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Axios / REST
┌──────────────────────────┴──────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    API Layer                         │    │
│  │  health │ discovery │ benchmark │ compat │ planner  │    │
│  │                          │ reports                   │    │
│  └──────────────────────────┼──────────────────────────┘    │
│  ┌──────────────────────────┴──────────────────────────┐    │
│  │                  Domain Modules                      │    │
│  │  discovery │ graph │ readiness │ benchmark           │    │
│  │  compatibility │ blockers │ planner │ reports        │    │
│  │  security │ utils                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Infrastructure Layer                    │    │
│  │  config │ models │ schemas │ services │ assets       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `api/` | HTTP route handlers — request/response boundary |
| `config/` | Application settings, logging, environment management |
| `models/` | Domain data models and entities |
| `schemas/` | Pydantic request/response validation schemas |
| `services/` | Cross-cutting business logic orchestration |
| `discovery/` | Enterprise cryptographic asset scanning engine |
| `graph/` | Dependency graph construction (NetworkX) |
| `readiness/` | PQC migration readiness scoring |
| `benchmark/` | Algorithm performance benchmarking |
| `compatibility/` | System-algorithm compatibility matrix |
| `blockers/` | Migration blocker detection and tracking |
| `planner/` | Migration sequencing and execution planning |
| `reports/` | Deployment report generation and audit trails |
| `security/` | Policy enforcement and cryptographic validation |
| `utils/` | Shared helpers and cross-cutting utilities |
| `assets/` | Enterprise configuration templates (YAML) |

## Design Principles

1. **Separation of Concerns** — API layer is thin; domain logic lives in dedicated modules.
2. **Dependency Inversion** — Services depend on abstractions, not concrete implementations.
3. **Configuration as Code** — All settings externalized via environment variables.
4. **Structured Logging** — Consistent log format for production observability.
5. **Schema Validation** — Pydantic schemas enforce contracts at the API boundary.
