"""
Quantum Circuit Simulator API Endpoints.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.quantum.simulator import QuantumSimulator

logger = logging.getLogger("pqc_engine.api.quantum")

router = APIRouter()

class QuantumGateSchema(BaseModel):
    """Schema representing a single quantum gate."""
    type: str = Field(..., description="Gate type: 'H', 'CX', 'X', 'Y', 'Z', 'S', 'T', 'MEASURE'")
    qubits: List[int] = Field(..., description="Indices of qubits the gate operates on")

class QuantumSimulateRequest(BaseModel):
    """Request schema for running a quantum simulation."""
    gates: List[QuantumGateSchema] = Field(default_factory=list, description="Sequence of gates to execute")
    shots: int = Field(1024, ge=1, le=100000, description="Number of sampling iterations for measurements")

@router.post("/simulate", summary="Simulate a 4-qubit quantum circuit")
async def simulate_circuit(request: QuantumSimulateRequest):
    """
    Constructs and runs a 4-qubit quantum circuit based on the gate list.
    Returns statevector amplitudes, measurement histograms, and circuit metadata.
    """
    try:
        gates_list = [g.model_dump() for g in request.gates]
        logger.info("Executing 4-qubit quantum simulation with %d gates", len(gates_list))
        
        results = QuantumSimulator.run_simulation(gates=gates_list, shots=request.shots)
        return JSONResponse(content=results)
        
    except ValueError as val_err:
        logger.error("Simulation validation failed: %s", str(val_err))
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as exc:
        logger.error("Simulation execution error: %s", str(exc))
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(exc)}")
