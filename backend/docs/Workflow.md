# Workflow — Enterprise PQC Migration Sequencing Engine

## Migration Pipeline Stages

The engine follows a structured pipeline to guide enterprises through
PQC migration safely and systematically.

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Stage 1  │───▶│ Stage 2  │───▶│ Stage 3  │───▶│ Stage 4  │
│Discovery │    │Analysis  │    │Planning  │    │Reporting │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Stage 1: Enterprise Discovery

- Scan enterprise infrastructure configuration (YAML-defined)
- Catalog all cryptographic assets (algorithms, protocols, libraries)
- Map system-to-system dependencies

### Stage 2: Analysis

- **Dependency Graph** — Build a directed graph of cryptographic dependencies
- **Benchmark** — Evaluate PQC algorithm performance characteristics
- **Compatibility** — Assess system compatibility with target PQC algorithms
- **Readiness** — Score each system's migration readiness
- **Blockers** — Identify migration blockers and constraints

### Stage 3: Migration Planning

- Generate topologically-ordered migration sequence
- Account for dependency constraints and blockers
- Produce a phased execution plan

### Stage 4: Deployment Reporting

- Generate comprehensive migration deployment report
- Include risk assessments and rollback strategies
- Provide audit trail for compliance

## Data Flow

```
YAML Config ─▶ Discovery ─▶ Dependency Graph ─▶ Analysis
                                                    │
                                          ┌─────────┴─────────┐
                                          │                    │
                                     Benchmark          Compatibility
                                          │                    │
                                          └─────────┬─────────┘
                                                    │
                                              Planner ─▶ Report
```
