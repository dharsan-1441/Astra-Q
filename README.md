<<<<<<< HEAD
# Enterprise Post-Quantum Cryptography (PQC) Migration Sequencing Engine

An engineering-grade framework and dashboard designed to orchestrate and plan an enterprise's transition from classical cryptography (RSA, ECC) to standardized NIST Post-Quantum Cryptography algorithms (**ML-KEM** and **ML-DSA**).

---

## Key Features

1. **System & Asset Discovery (Phase 1 & 2)**
   - Parse complex enterprise configurations (YAML) representing hosts, certificates, and infrastructure.
   - Dynamically inspect active SSL/TLS handshake protocols via network socket queries.
   - Register system records manually via interactive forms.

2. **Communication Dependency Graph (Phase 3)**
   - Analyze dependencies to build a directed communication graph.
   - Detect circular dependencies, isolated systems, bridge nodes, and maximum depth.
   - Compute coordinate layouts for interactive canvas rendering.

3. **Cryptographic Benchmarking (Phase 4)**
   - Measure actual execution times, CPU percentages, and memory footprints for key generation, encapsulation, decapsulation, signing, and verification.
   - Native integration with NIST `liboqs` C bindings when available, with structural fallbacks.

4. **Multi-Vector Readiness Assessment (Phase 5)**
   - Analyze readiness across 6 distinct vectors: Library support, Certificate signatures, TLS versions, Hardware constraints, Software stack dependencies, and Benchmark profiles.
   - Generate detailed readiness scores (0-100%) and classifications (PQC Ready, Hybrid Ready, Upgrade Required, Legacy Blocker).

5. **Topological Migration Wave Scheduler (Phase 6)**
   - Topologically schedule migration waves using dependency orderings.
   - Prevent concurrent upgrades of critical clustered systems.
   - Compute step risk scores using weighted asset criticality and dependency footprints.

6. **Consolidated Executive & Technical PDF Reports (Phase 7)**
   - Synthesize data across all modules into unified reports.
   - Zero-dependency byte-level PDF-1.4 writer producing formatted multi-page audit documents.

---

## Repository Structure

```
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Route definitions
│   │   ├── benchmark/        # Performance benchmarking core
│   │   ├── config/           # Application configuration and settings
│   │   ├── discovery/        # Inventory and TLS scan handlers
│   │   ├── graph/            # Dependency network builder and analyzer
│   │   ├── planner/          # Wave scheduler and risk engine
│   │   ├── readiness/        # 6-vector analysis assessment engine
│   │   └── reports/          # Report compiler & native PDF exporter
│   ├── output/               # Local cache storage (JSON reports, sessions)
│   ├── requirements.txt      # Python dependencies
│   └── main.py               # Backend entry point
│
└── frontend/                 # Vite + React + Material UI Application
    ├── src/
    │   ├── api/              # API integration layer
    │   ├── components/       # Reusable layout and visualization components
    │   ├── pages/            # View pages (Readiness, Graph, Planner, etc.)
    │   └── main.jsx          # Frontend entry point
=======
# AstraQ – Enterprise PQC Migration Engine

> Enterprise Post-Quantum Cryptography Migration Platform for Discovery, Risk Assessment, Benchmarking, Quantum Threat Simulation, Migration Planning, and Deployment Reporting.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/Python-3.14+-yellow)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![NIST PQC](https://img.shields.io/badge/NIST-PQC-orange)

---

## Overview

AstraQ is an enterprise-grade prototype that assists organizations in planning their migration from classical cryptography to Post-Quantum Cryptography (PQC).

Rather than only benchmarking cryptographic algorithms, AstraQ analyzes an organization's cryptographic landscape, evaluates quantum readiness, benchmarks standardized NIST PQC algorithms, simulates quantum attack scenarios, and generates phased migration plans with executive-ready deployment reports.

The platform is designed as a complete migration orchestration engine suitable for large enterprises, government organizations, financial institutions, healthcare providers, and cloud infrastructure environments.

---

# Key Features

## Enterprise Discovery

- Import enterprise infrastructure using YAML configuration
- Discover cryptographic assets
- Identify servers, applications, APIs, certificates, databases, libraries, and cryptographic dependencies
- Build enterprise asset inventory

---

## Dependency Graph Engine

- Interactive dependency visualization
- Communication graph analysis
- Topological dependency mapping
- Critical asset identification
- Migration impact visualization

---

## Compatibility Analysis

Automatically evaluates

- PQC compatibility
- TLS versions
- Certificate readiness
- Legacy algorithm usage
- Operating system support
- Cryptographic library availability
- OpenSSL compatibility

---

## Readiness Assessment

Generates organization-wide readiness scores based on

- Infrastructure compatibility
- PQC adoption level
- Critical asset exposure
- Dependency importance
- Security posture

---

## Benchmark Engine

Native benchmarking for NIST standardized algorithms.

Supports

### ML-KEM

- Key Generation
- Encapsulation
- Decapsulation

### ML-DSA

- Key Generation
- Signature Generation
- Signature Verification

Supports three hybrid security levels

- Level 1 (ML-KEM-512 + ML-DSA-44)
- Level 3 (ML-KEM-768 + ML-DSA-65)
- Level 5 (ML-KEM-1024 + ML-DSA-87)

Also benchmarks

- TLS 1.1
- TLS 1.2
- TLS 1.3

Performance metrics include

- Latency
- Throughput
- Memory Usage
- Handshake Performance
- Certificate Verification
- Session Establishment Time

---

## Quantum Threat & PQC Simulator

Interactive 4-Qubit simulation demonstrating

- Quantum Register Initialization
- Superposition
- Entanglement
- Oracle Operations
- Amplitude Amplification
- Measurement
- Threat Analysis

Provides analytical metrics such as

- Gate Count
- Qubit Memory Usage
- Circuit Depth
- Estimated Time Complexity
- Estimated Space Complexity
- Quantum Resource Utilization
- Quantum Vulnerability Score

---

## Migration Planner

Automatically generates phased migration plans.

Features

- Migration Waves
- Risk Prioritization
- Maintenance Windows
- Rollback Strategies
- Critical Asset Scheduling
- Executive Timeline
- Risk Matrix
- AI-style Recommendations

---

## Executive Audit Report

Generates enterprise-ready reports containing

- Executive Dashboard
- KPI Cards
- Risk Distribution
- Migration Readiness
- Technical Assessment
- Migration Waves
- Compliance Mapping
- Gantt Timeline
- Risk Matrix
- Executive Action Plan

Export formats

- PDF
- JSON
- Print-ready Report

---

# Architecture

```
                  Enterprise YAML
                         │
                         ▼
                Enterprise Discovery
                         │
                         ▼
                 Dependency Graph
                         │
                         ▼
              Compatibility Analysis
                         │
                         ▼
                Readiness Assessment
                         │
                         ▼
                Benchmark Engine
                         │
                         ▼
          Quantum Threat Simulator
                         │
                         ▼
               Migration Planner
                         │
                         ▼
          Executive Deployment Report
```

---

# Technology Stack

## Frontend

- React
- Material UI (MUI)
- Recharts
- React Router
- Axios

## Backend

- FastAPI
- Python
- Pydantic
- NetworkX
- Matplotlib
- liboqs (Open Quantum Safe)

---

# Project Structure

```
backend/
│
├── app/
│   ├── discovery/
│   ├── graph/
│   ├── compatibility/
│   ├── readiness/
│   ├── benchmark/
│   ├── planner/
│   ├── reports/
│   └── security/
│
frontend/
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── api/
│   ├── hooks/
│   └── theme/
>>>>>>> 6260c94c2deece0c74e411b76571bb2f35ef1df0
```

---

<<<<<<< HEAD
## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ (with npm)
- *Optional:* Native `liboqs` installed on the system (for live cryptographic benchmarking)

### 1. Backend Service Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```
The backend API service will listen on `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```
The web interface will launch at `http://localhost:5173`.

---

## Verification & Testing

### Running Backend Unit Tests
To run the complete test suite verifying graph, readiness, benchmark, planner, and exporter layers:
```bash
cd backend
source venv/bin/activate
python -m unittest discover -s app -p "test_*.py"
```

### Compiling Frontend Production Bundle
To build the optimized static asset bundle:
```bash
cd frontend
npm run build
```

---

## License
Proprietary Enterprise Software. All Rights Reserved.
=======
# Installation

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Screens

- Enterprise Dashboard
- Enterprise Discovery
- Dependency Graph
- Compatibility Analysis
- Readiness Assessment
- Benchmark Engine
- Quantum Threat Simulator
- Migration Planner
- Executive Audit Report

---

# Target Users

- Large Enterprises
- Government Organizations
- Financial Institutions
- Healthcare Providers
- Telecom Operators
- Cloud Providers
- Critical Infrastructure

---

# Future Enhancements

- Digital Twin Migration Simulation
- Multi-Enterprise Support
- AI Migration Recommendations
- Kubernetes Deployment
- Cloud Integration
- Continuous Compliance Monitoring
- Automated Migration Execution

---

# Authors

Pranav M

B.Tech Computer Science and Business Systems

Hackathon Prototype

---

# License

This project is intended for academic research, hackathons, and educational demonstrations.
>>>>>>> 6260c94c2deece0c74e411b76571bb2f35ef1df0
