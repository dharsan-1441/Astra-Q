"""
Quantum Circuit Simulator Service.
Provides a 4-qubit simulation layer using Qiskit.
"""

import time
from typing import Any, Dict, List, Tuple
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

class QuantumSimulator:
    """Manages construction and simulation of a 4-qubit quantum circuit."""

    @staticmethod
    def run_simulation(gates: List[Dict[str, Any]], shots: int = 1024) -> Dict[str, Any]:
        """
        Build and simulate a 4-qubit quantum circuit.
        
        Args:
            gates: List of gate definitions, e.g., [{"type": "H", "qubits": [0]}]
            shots: Number of measurement sample iterations
            
        Returns:
            Dictionary containing simulation outcomes, metrics, and ASCII diagram.
        """
        t0 = time.perf_counter()
        
        # Initialize 4-qubit circuit
        qc = QuantumCircuit(4)
        
        # Apply gates in order
        for gate in gates:
            g_type = gate.get("type", "").upper().strip()
            qubits = gate.get("qubits", [])
            
            if not qubits:
                continue
                
            # Verify qubit bounds
            if any(q < 0 or q > 3 for q in qubits):
                raise ValueError("Qubit indices must be between 0 and 3 inclusive.")
                
            if g_type == "H":
                qc.h(qubits[0])
            elif g_type == "CX" or g_type == "CNOT":
                if len(qubits) < 2:
                    raise ValueError("CNOT gate requires control and target qubits.")
                if qubits[0] == qubits[1]:
                    raise ValueError("CNOT control and target qubits must be distinct.")
                qc.cx(qubits[0], qubits[1])
            elif g_type == "X":
                qc.x(qubits[0])
            elif g_type == "Y":
                qc.y(qubits[0])
            elif g_type == "Z":
                qc.z(qubits[0])
            elif g_type == "S":
                qc.s(qubits[0])
            elif g_type == "T":
                qc.t(qubits[0])
            elif g_type == "MEASURE":
                # We handle measurement via Statevector sampling for consistency,
                # but we still allow adding measurement gates to the circuit representation.
                pass
                
        # Compute exact statevector before measurement collapse
        sv = Statevector(qc)
        t1 = time.perf_counter()
        execution_time_ms = (t1 - t0) * 1000.0
        
        # Sample measurement counts from the statevector
        counts = sv.sample_counts(shots=shots)
        # Normalize counts keys and values from numpy types to python standard types
        formatted_counts = {str(k): int(v) for k, v in counts.items()}
        
        # Formulate statevector representation
        # Formats amplitude: (real + imag * j) and its probability
        statevector_data = []
        for i, val in enumerate(sv.data):
            real_part = float(val.real)
            imag_part = float(val.imag)
            prob = float(abs(val) ** 2)
            statevector_data.append({
                "state": f"|{i:04b}>",
                "real": real_part,
                "imag": imag_part,
                "probability": prob
            })
            
        # Draw the circuit in ASCII
        qc_draw = qc.copy()
        qc_draw.measure_all()
        ascii_diagram = str(qc_draw.draw(output="text"))
        
        # Count operations
        ops = qc.count_ops()
        gate_distribution = {str(k): int(v) for k, v in ops.items()}
        
        # Assemble metrics
        result = {
            "qubit_count": 4,
            "circuit_depth": qc.depth(),
            "gate_count": len(qc),
            "gate_distribution": gate_distribution,
            "execution_time_ms": execution_time_ms,
            "statevector_dimension": int(sv.dim),
            "statevector": statevector_data,
            "counts": formatted_counts,
            "ascii_diagram": ascii_diagram,
        }
        
        return result
