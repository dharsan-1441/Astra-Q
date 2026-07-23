"""
Unit tests for the Quantum Circuit Simulator service.
"""

import unittest
from app.quantum.simulator import QuantumSimulator

class TestQuantumSimulator(unittest.TestCase):
    """Tests the functionality of the QuantumSimulator class."""

    def test_empty_circuit(self):
        """Test simulating an empty circuit."""
        results = QuantumSimulator.run_simulation([], shots=100)
        self.assertEqual(results["qubit_count"], 4)
        self.assertEqual(results["circuit_depth"], 0)
        self.assertEqual(results["gate_count"], 0)
        self.assertEqual(results["statevector_dimension"], 16)
        
        # All probability should be in the |0000> state
        statevector = results["statevector"]
        self.assertEqual(len(statevector), 16)
        self.assertEqual(statevector[0]["state"], "|0000>")
        self.assertAlmostEqual(statevector[0]["probability"], 1.0)
        self.assertAlmostEqual(sum(s["probability"] for s in statevector), 1.0)

    def test_superposition(self):
        """Test applying Hadamard gate on qubit 0."""
        gates = [{"type": "H", "qubits": [0]}]
        results = QuantumSimulator.run_simulation(gates, shots=100)
        self.assertEqual(results["gate_count"], 1)
        self.assertEqual(results["circuit_depth"], 1)
        
        # State should be (|0000> + |0001>) / sqrt(2)
        statevector = results["statevector"]
        self.assertAlmostEqual(statevector[0]["probability"], 0.5)
        self.assertAlmostEqual(statevector[1]["probability"], 0.5)
        self.assertAlmostEqual(sum(s["probability"] for s in statevector), 1.0)

    def test_entanglement(self):
        """Test applying H(0) and CX(0, 1) to create a Bell state."""
        gates = [
            {"type": "H", "qubits": [0]},
            {"type": "CX", "qubits": [0, 1]}
        ]
        results = QuantumSimulator.run_simulation(gates, shots=100)
        self.assertEqual(results["gate_count"], 2)
        self.assertEqual(results["circuit_depth"], 2)
        
        # State should be (|0000> + |0011>) / sqrt(2)
        statevector = results["statevector"]
        self.assertAlmostEqual(statevector[0]["probability"], 0.5)
        self.assertAlmostEqual(statevector[3]["probability"], 0.5)
        self.assertAlmostEqual(sum(s["probability"] for s in statevector), 1.0)

    def test_invalid_qubit(self):
        """Test that invalid qubit index raises ValueError."""
        gates = [{"type": "H", "qubits": [4]}]
        with self.assertRaises(ValueError):
            QuantumSimulator.run_simulation(gates)

    def test_invalid_cnot(self):
        """Test that CNOT on identical qubits raises ValueError."""
        gates = [{"type": "CX", "qubits": [1, 1]}]
        with self.assertRaises(ValueError):
            QuantumSimulator.run_simulation(gates)

if __name__ == "__main__":
    unittest.main()
