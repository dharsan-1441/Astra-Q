import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, MenuItem, Select,
  FormControl, InputLabel, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Tab, Tabs, alpha, useTheme,
  Collapse, Paper, Tooltip, Divider, LinearProgress
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Science as QuantumIcon,
  Storage as MemoryIcon,
  CompareArrows as CompareIcon,
  Analytics as AnalyticsIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  Memory as CpuIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  NetworkCheck as NetworkCheckIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  DeveloperBoard as RamIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter
} from 'recharts';

import { quantumService } from '../api/services';
import ChartWrapper from '../components/charts/ChartWrapper';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

// Presets definitions
const PRESETS = {
  superposition: {
    name: 'Equal Superposition',
    description: 'Applies Hadamard gates to all 4 qubits to create an equal superposition of all 16 states.',
    gates: [
      { type: 'H', qubits: [0] },
      { type: 'H', qubits: [1] },
      { type: 'H', qubits: [2] },
      { type: 'H', qubits: [3] }
    ]
  },
  bell: {
    name: 'Bell State (Entanglement)',
    description: 'Entangles Qubit 0 and Qubit 1 using a Hadamard followed by a CNOT gate.',
    gates: [
      { type: 'H', qubits: [0] },
      { type: 'CX', qubits: [0, 1] }
    ]
  },
  ghz: {
    name: '4-Qubit GHZ State',
    description: 'Creates a Greenberger-Horne-Zeilinger state representing maximal entanglement of 4 qubits.',
    gates: [
      { type: 'H', qubits: [0] },
      { type: 'CX', qubits: [0, 1] },
      { type: 'CX', qubits: [1, 2] },
      { type: 'CX', qubits: [2, 3] }
    ]
  },
  wstate: {
    name: '4-Qubit W State',
    description: 'Constructs a W State (|0001> + |0010> + |0100> + |1000>) / 2, representing multipartite entanglement.',
    gates: [
      { type: 'H', qubits: [0] },
      { type: 'CX', qubits: [0, 1] },
      { type: 'CX', qubits: [1, 2] },
      { type: 'CX', qubits: [2, 3] },
      { type: 'X', qubits: [0] },
      { type: 'H', qubits: [1] },
      { type: 'CX', qubits: [1, 0] }
    ]
  }
};

const heatMapConfig = [
  { algo: 'RSA-2048', security: '112 Bits', Grover: 'Critical', Shor: 'Vulnerable', resistance: 'Legacy', classicalBreak: '> 1 Trillion Years', quantumBreak: '< 10 Seconds (FTQC)' },
  { algo: 'RSA-4096', security: '128 Bits', Grover: 'Critical', Shor: 'Vulnerable', resistance: 'Legacy', classicalBreak: '> 10^30 Years', quantumBreak: '< 1 Minute (FTQC)' },
  { algo: 'ECDSA P-256', security: '128 Bits', Grover: 'Critical', Shor: 'Vulnerable', resistance: 'Legacy', classicalBreak: '> 10^20 Years', quantumBreak: '< 5 Seconds (FTQC)' },
  { algo: 'AES-128', security: '128 Bits', Grover: 'Secure', Shor: 'Secure', resistance: 'Quantum-Safe', classicalBreak: '> 10^20 Years', quantumBreak: '> 10^9 Years (Grover)' },
  { algo: 'AES-256', security: '256 Bits', Grover: 'Secure', Shor: 'Secure', resistance: 'Quantum-Safe', classicalBreak: '> 10^50 Years', quantumBreak: '> 10^30 Years (Grover)' },
  { algo: 'ML-KEM-768', security: '192 Bits', Grover: 'Secure', Shor: 'Secure', resistance: 'Quantum-Safe', classicalBreak: '> 10^40 Years', quantumBreak: '> 10^25 Years' },
  { algo: 'ML-DSA-65', security: '192 Bits', Grover: 'Secure', Shor: 'Secure', resistance: 'Quantum-Safe', classicalBreak: '> 10^40 Years', quantumBreak: '> 10^25 Years' },
];

const HYBRID_LEVEL_SPECS = {
  1: {
    levelName: "Hybrid Level 1",
    suite: "ML-KEM-512 + ML-DSA Level 1",
    qubits: 4,
    classicalBits: 4,
    quantumGates: 6,
    singleQubitGates: 4,
    twoQubitGates: 2,
    circuitDepth: 4,
    estimatedQuantumMemory: "256 Qubits (Logical)",
    estimatedClassicalMemory: "3.2 KB",
    estimatedTimeComplexity: "O(n log n)",
    estimatedSpaceComplexity: "O(n)",
    estimatedQuantumExecutionTime: "12.4 ms",
    estimatedClassicalExecutionTime: "0.15 ms",
    totalOperations: 8,
    gateDensity: "75%",
    resourceEfficiencyScore: "85/100",
    
    // Break Times
    classicalBreakTime: "> 10^20 Years",
    quantumBreakTime: "> 10^12 Years",
    
    // Complexity
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    quantumMemoryComplexity: "O(N)",
    communicationComplexity: "O(N)",
    securityStrength: "128 Bits (NIST Level 1)",
    computationalCost: "Low",
    
    // Bits & Memory
    privateKeySize: 1632,
    publicKeySize: 800,
    ciphertextSize: 768,
    signatureSize: 2420,
    sharedSecretSize: 32,
    totalClassicalMemory: 5652, // Sum of keys/cipher/sig
    estimatedQuantumMemoryBytes: 256,
    estimatedWorkingMemory: 10240, // 10 KB
    
    // Stats
    circuitWidth: 4,
    measurementCount: 4,
    entanglementCount: 2,
    gateUtilization: "80%",
    avgGateCost: "1.2 μs",
    fidelity: "99.8%",
    executionProbability: "87.5%",
    
    // Charts Data
    gateDistribution: [
      { name: 'Hadamard', count: 3 },
      { name: 'CNOT', count: 2 },
      { name: 'X', count: 1 },
      { name: 'Z', count: 0 },
      { name: 'Measurement', count: 4 }
    ],
    memoryAllocation: [
      { name: 'Private Key', value: 1632 },
      { name: 'Public Key', value: 800 },
      { name: 'Ciphertext', value: 768 },
      { name: 'Signature', value: 2420 },
      { name: 'Shared Secret', value: 32 }
    ],
    quantumVsClassical: [
      { category: 'Keys Memory', Classical: 2432, Quantum: 256 },
      { category: 'Buffer Memory', Classical: 3220, Quantum: 512 },
      { category: 'Total Latency', Classical: 1.5, Quantum: 12.4 }
    ],
    gateUtilizationMatrix: [
      { qubit: 'q_0', H: 1, CX: 1, X: 1, Z: 0, M: 1 },
      { qubit: 'q_1', H: 1, CX: 1, X: 0, Z: 0, M: 1 },
      { qubit: 'q_2', H: 1, CX: 0, X: 0, Z: 0, M: 1 },
      { qubit: 'q_3', H: 0, CX: 0, X: 0, Z: 0, M: 1 }
    ],
    
    // Summary
    overallResourceConsumption: "Low",
    overallComplexity: "O(N log N)",
    overallSecurityRating: "Good (NIST 1)",
    quantumReadiness: "70%",
    estimatedDeploymentCost: "$12,000",
    estimatedComputationalOverhead: "+15%",
    recommendedEnterpriseSize: "Small Enterprise",
    suitableFor: "Small Enterprise"
  },
  2: {
    levelName: "Hybrid Level 2",
    suite: "ML-KEM-768 + ML-DSA Level 3",
    qubits: 4,
    classicalBits: 4,
    quantumGates: 10,
    singleQubitGates: 6,
    twoQubitGates: 4,
    circuitDepth: 6,
    estimatedQuantumMemory: "512 Qubits (Logical)",
    estimatedClassicalMemory: "6.4 KB",
    estimatedTimeComplexity: "O(n log n)",
    estimatedSpaceComplexity: "O(n)",
    estimatedQuantumExecutionTime: "24.5 ms",
    estimatedClassicalExecutionTime: "0.28 ms",
    totalOperations: 14,
    gateDensity: "85%",
    resourceEfficiencyScore: "90/100",
    
    // Break Times
    classicalBreakTime: "> 10^30 Years",
    quantumBreakTime: "> 10^18 Years",
    
    // Complexity
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    quantumMemoryComplexity: "O(N)",
    communicationComplexity: "O(N)",
    securityStrength: "192 Bits (NIST Level 3)",
    computationalCost: "Medium",
    
    // Bits & Memory
    privateKeySize: 2400,
    publicKeySize: 1184,
    ciphertextSize: 1088,
    signatureSize: 3300,
    sharedSecretSize: 32,
    totalClassicalMemory: 8004,
    estimatedQuantumMemoryBytes: 512,
    estimatedWorkingMemory: 16384, // 16 KB
    
    // Stats
    circuitWidth: 4,
    measurementCount: 4,
    entanglementCount: 4,
    gateUtilization: "90%",
    avgGateCost: "1.5 μs",
    fidelity: "99.5%",
    executionProbability: "82.1%",
    
    // Charts Data
    gateDistribution: [
      { name: 'Hadamard', count: 4 },
      { name: 'CNOT', count: 4 },
      { name: 'X', count: 1 },
      { name: 'Z', count: 1 },
      { name: 'Measurement', count: 4 }
    ],
    memoryAllocation: [
      { name: 'Private Key', value: 2400 },
      { name: 'Public Key', value: 1184 },
      { name: 'Ciphertext', value: 1088 },
      { name: 'Signature', value: 3300 },
      { name: 'Shared Secret', value: 32 }
    ],
    quantumVsClassical: [
      { category: 'Keys Memory', Classical: 3584, Quantum: 512 },
      { category: 'Buffer Memory', Classical: 4420, Quantum: 1024 },
      { category: 'Total Latency', Classical: 2.8, Quantum: 24.5 }
    ],
    gateUtilizationMatrix: [
      { qubit: 'q_0', H: 2, CX: 2, X: 1, Z: 0, M: 1 },
      { qubit: 'q_1', H: 1, CX: 2, X: 0, Z: 1, M: 1 },
      { qubit: 'q_2', H: 1, CX: 0, X: 0, Z: 0, M: 1 },
      { qubit: 'q_3', H: 0, CX: 0, X: 0, Z: 0, M: 1 }
    ],
    
    // Summary
    overallResourceConsumption: "Medium",
    overallComplexity: "O(N log N)",
    overallSecurityRating: "Excellent (NIST 3)",
    quantumReadiness: "85%",
    estimatedDeploymentCost: "$25,000",
    estimatedComputationalOverhead: "+28%",
    recommendedEnterpriseSize: "Medium Enterprise",
    suitableFor: "Medium Enterprise"
  },
  3: {
    levelName: "Hybrid Level 3",
    suite: "ML-KEM-1024 + ML-DSA Level 5",
    qubits: 4,
    classicalBits: 4,
    quantumGates: 15,
    singleQubitGates: 9,
    twoQubitGates: 6,
    circuitDepth: 9,
    estimatedQuantumMemory: "1024 Qubits (Logical)",
    estimatedClassicalMemory: "12.8 KB",
    estimatedTimeComplexity: "O(n log n)",
    estimatedSpaceComplexity: "O(n)",
    estimatedQuantumExecutionTime: "48.2 ms",
    estimatedClassicalExecutionTime: "0.45 ms",
    totalOperations: 21,
    gateDensity: "92%",
    resourceEfficiencyScore: "95/100",
    
    // Break Times
    classicalBreakTime: "> 10^50 Years",
    quantumBreakTime: "> 10^24 Years",
    
    // Complexity
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    quantumMemoryComplexity: "O(N)",
    communicationComplexity: "O(N)",
    securityStrength: "256 Bits (NIST Level 5)",
    computationalCost: "High",
    
    // Bits & Memory
    privateKeySize: 3168,
    publicKeySize: 1568,
    ciphertextSize: 1568,
    signatureSize: 4590,
    sharedSecretSize: 32,
    totalClassicalMemory: 10926,
    estimatedQuantumMemoryBytes: 1024,
    estimatedWorkingMemory: 24576, // 24 KB
    
    // Stats
    circuitWidth: 4,
    measurementCount: 4,
    entanglementCount: 6,
    gateUtilization: "95%",
    avgGateCost: "1.8 μs",
    fidelity: "99.1%",
    executionProbability: "74.8%",
    
    // Charts Data
    gateDistribution: [
      { name: 'Hadamard', count: 6 },
      { name: 'CNOT', count: 6 },
      { name: 'X', count: 2 },
      { name: 'Z', count: 1 },
      { name: 'Measurement', count: 4 }
    ],
    memoryAllocation: [
      { name: 'Private Key', value: 3168 },
      { name: 'Public Key', value: 1568 },
      { name: 'Ciphertext', value: 1568 },
      { name: 'Signature', value: 4590 },
      { name: 'Shared Secret', value: 32 }
    ],
    quantumVsClassical: [
      { category: 'Keys Memory', Classical: 4736, Quantum: 1024 },
      { category: 'Buffer Memory', Classical: 6190, Quantum: 2048 },
      { category: 'Total Latency', Classical: 4.5, Quantum: 48.2 }
    ],
    gateUtilizationMatrix: [
      { qubit: 'q_0', H: 3, CX: 3, X: 1, Z: 0, M: 1 },
      { qubit: 'q_1', H: 2, CX: 3, X: 1, Z: 1, M: 1 },
      { qubit: 'q_2', H: 1, CX: 0, X: 0, Z: 0, M: 1 },
      { qubit: 'q_3', H: 0, CX: 0, X: 0, Z: 0, M: 1 }
    ],
    
    // Summary
    overallResourceConsumption: "High",
    overallComplexity: "O(N log N)",
    overallSecurityRating: "Military / Gov Grade (NIST 5)",
    quantumReadiness: "98%",
    estimatedDeploymentCost: "$60,000",
    estimatedComputationalOverhead: "+45%",
    recommendedEnterpriseSize: "Government Infrastructure",
    suitableFor: "Government Infrastructure"
  }
};

const tooltipStyle = {
  backgroundColor: '#28221B',
  border: '1px solid rgba(180, 120, 70, 0.15)',
  borderRadius: 10,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 13,
  color: '#FFF6C8',
};

function QuantumSimulator() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus } = usePipeline();
  const [activeTab, setActiveTab] = useState(0);
  const [gates, setGates] = useState([]);
  const [shots, setShots] = useState(1024);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [asciiExpanded, setAsciiExpanded] = useState(false);
  const [showThreatInfo, setShowThreatInfo] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(2);
  const [stepperStage, setStepperStage] = useState(0);

  // Form states for adding custom gates
  const [newGateType, setNewGateType] = useState('H');
  const [newGateQ0, setNewGateQ0] = useState(0);
  const [newGateQ1, setNewGateQ1] = useState(1);

  const stepperStages = [
    {
      title: "Initialize Register",
      desc: "Sets up a 4-qubit quantum register in base state |0000> representing the legacy cryptographic key.",
      gates: []
    },
    {
      title: "Superposition",
      desc: "Applies Hadamard gates (H) to put qubits in superposition of all 16 states, simulating global exploration.",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] }
      ]
    },
    {
      title: "Entanglement",
      desc: "Applies CNOT (CX) gates to establish correlations across qubits, linking their states.",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'CX', qubits: [1, 2] },
        { type: 'CX', qubits: [2, 3] }
      ]
    },
    {
      title: "Oracle Query",
      desc: "Performs query mapping to mark target state containing target key/vulnerability (e.g. |1101>).",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'CX', qubits: [1, 2] },
        { type: 'CX', qubits: [2, 3] },
        { type: 'X', qubits: [2] },
        { type: 'X', qubits: [3] },
        { type: 'CX', qubits: [2, 0] }
      ]
    },
    {
      title: "Amplification",
      desc: "Applies Grover diffusion operator to amplify the target state's probability amplitude.",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'CX', qubits: [1, 2] },
        { type: 'CX', qubits: [2, 3] },
        { type: 'X', qubits: [2] },
        { type: 'X', qubits: [3] },
        { type: 'CX', qubits: [2, 0] },
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'H', qubits: [0] }
      ]
    },
    {
      title: "Measurement",
      desc: "Measures qubits, causing wavefunction collapse into the target classical key state.",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'CX', qubits: [1, 2] },
        { type: 'CX', qubits: [2, 3] },
        { type: 'X', qubits: [2] },
        { type: 'X', qubits: [3] },
        { type: 'CX', qubits: [2, 0] },
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'H', qubits: [0] }
      ]
    },
    {
      title: "Threat Analysis",
      desc: "Generates final attack metrics & recommended PQC migration urgency level.",
      gates: [
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'CX', qubits: [1, 2] },
        { type: 'CX', qubits: [2, 3] },
        { type: 'X', qubits: [2] },
        { type: 'X', qubits: [3] },
        { type: 'CX', qubits: [2, 0] },
        { type: 'H', qubits: [0] },
        { type: 'H', qubits: [1] },
        { type: 'H', qubits: [2] },
        { type: 'H', qubits: [3] },
        { type: 'CX', qubits: [0, 1] },
        { type: 'H', qubits: [0] }
      ]
    }
  ];

  // Trigger simulation whenever stepper stage changes (only set gates, do not run automatically)
  useEffect(() => {
    const targetGates = stepperStages[stepperStage].gates;
    setGates(targetGates);
    setResults(null); // Clear previous results to require manual execution
  }, [stepperStage]);

  const handleRunSimulation = async (gatesOverride = null) => {
    setIsRunning(true);
    setError(null);
    try {
      const gatesToSimulate = gatesOverride || gates;
      const formattedGates = gatesToSimulate.map(g => ({
        type: g.type,
        qubits: g.type === 'CX' ? [g.qubits[0], g.qubits[1]] : [g.qubits[0]]
      }));
      const res = await quantumService.simulate({ gates: formattedGates, shots });
      setResults(res.data);
      updateStepStatus('quantumSimulator', 'completed');
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddGate = () => {
    const qubits = newGateType === 'CX' ? [newGateQ0, newGateQ1] : [newGateQ0];
    if (newGateType === 'CX' && newGateQ0 === newGateQ1) {
      setError('CNOT control and target qubits must be distinct.');
      return;
    }
    setGates([...gates, { type: newGateType, qubits }]);
    setError(null);
  };

  const handleDeleteGate = (index) => {
    const updated = [...gates];
    updated.splice(index, 1);
    setGates(updated);
  };

  const handleLoadPreset = (presetKey) => {
    if (PRESETS[presetKey]) {
      setGates(PRESETS[presetKey].gates);
    }
  };

  const handleClearCircuit = () => {
    setGates([]);
  };

  // Compute local metrics from simulation results
  const resourceMetrics = useMemo(() => {
    if (!results) return null;
    
    const spec = HYBRID_LEVEL_SPECS[selectedLevel];
    
    // Qubit utilization
    const usedQubits = new Set();
    gates.forEach(g => g.qubits.forEach(q => usedQubits.add(q)));
    const utilization = Math.round((usedQubits.size / 4) * 100);

    // Dynamic gate categories
    const singleQubitGates = gates.filter(g => g.type !== 'CX').length;
    const twoQubitGates = gates.filter(g => g.type === 'CX').length;
    const depth = results.circuit_depth;
    
    // Theoretical estimates and measured simulator values
    const qubitsCount = 4;
    const classicalBitsCount = 4;
    const gateCount = gates.length;
    const totalOps = gateCount + classicalBitsCount; // gates + measurements
    
    // Density: ratio of gates to (qubits * depth)
    const gateDensity = depth > 0 ? Math.min(100, Math.round((gateCount / (qubitsCount * depth)) * 100)) : 0;
    
    // Memory
    const estimatedQuantumMemory = `${spec.estimatedQuantumMemoryBytes} Qubits`;
    const estimatedClassicalMemory = `${(spec.totalClassicalMemory / 1024).toFixed(1)} KB`;
    
    // Efficiency: lower depth & fewer gates = higher efficiency
    const rawEfficiency = Math.max(10, 100 - (depth * 3 + gateCount * 2));
    const resourceEfficiencyScore = `${rawEfficiency}/100`;

    return {
      utilization,
      qubits: qubitsCount,
      classicalBits: classicalBitsCount,
      gateCount,
      singleQubitGates,
      twoQubitGates,
      depth,
      estimatedQuantumMemory,
      estimatedClassicalMemory,
      estimatedTimeComplexity: spec.estimatedTimeComplexity,
      estimatedSpaceComplexity: spec.estimatedSpaceComplexity,
      estimatedQuantumExecutionTime: spec.estimatedQuantumExecutionTime,
      estimatedClassicalExecutionTime: spec.estimatedClassicalExecutionTime,
      totalOperations: totalOps,
      gateDensity: `${gateDensity}%`,
      resourceEfficiencyScore,
      
      // Complexity Panel
      timeComplexity: spec.timeComplexity,
      spaceComplexity: spec.spaceComplexity,
      quantumMemoryComplexity: spec.quantumMemoryComplexity,
      communicationComplexity: spec.communicationComplexity,
      securityStrength: spec.securityStrength,
      computationalCost: spec.computationalCost,
      
      // Bits & Memory
      privateKeySize: spec.privateKeySize,
      publicKeySize: spec.publicKeySize,
      ciphertextSize: spec.ciphertextSize,
      signatureSize: spec.signatureSize,
      sharedSecretSize: spec.sharedSecretSize,
      totalClassicalMemory: spec.totalClassicalMemory,
      estimatedQuantumMemoryBytes: spec.estimatedQuantumMemoryBytes,
      estimatedWorkingMemory: spec.estimatedWorkingMemory,
      
      // Quantum Circuit Statistics
      circuitWidth: qubitsCount,
      measurementCount: gates.filter(g => g.type === 'M' || g.type === 'Measure').length || 4,
      entanglementCount: twoQubitGates,
      gateUtilization: `${utilization}%`,
      avgGateCost: spec.avgGateCost,
      fidelity: spec.fidelity,
      executionProbability: spec.executionProbability,
      
      // Summary Panel
      overallResourceConsumption: spec.overallResourceConsumption,
      overallComplexity: spec.overallComplexity,
      overallSecurityRating: spec.overallSecurityRating,
      quantumReadiness: spec.quantumReadiness,
      estimatedDeploymentCost: spec.estimatedDeploymentCost,
      estimatedComputationalOverhead: spec.estimatedComputationalOverhead,
      recommendedEnterpriseSize: spec.recommendedEnterpriseSize,
      suitableFor: spec.suitableFor,
      classicalBreakTime: spec.classicalBreakTime,
      quantumBreakTime: spec.quantumBreakTime
    };
  }, [results, gates, selectedLevel]);

  // Recharts structured gate data
  const gateDistributionData = useMemo(() => {
    if (!results || !results.gate_distribution) return [];
    return Object.entries(results.gate_distribution).map(([gate, count]) => ({
      name: gate.toUpperCase(),
      count
    }));
  }, [results]);

  // Recharts structured statevector amplitude probabilities
  const statevectorChartData = useMemo(() => {
    if (!results || !results.statevector) return [];
    return results.statevector.map(sv => ({
      state: sv.state,
      probability: Math.round(sv.probability * 1000) / 10
    }));
  }, [results]);

  // Recharts structured measurement counts
  const measurementCountsData = useMemo(() => {
    if (!results || !results.counts) return [];
    return Object.entries(results.counts).map(([state, count]) => ({
      state: `|${state}>`,
      count
    })).sort((a, b) => a.state.localeCompare(b.state));
  }, [results]);

  // Radar metrics data
  const radarMetricsData = useMemo(() => {
    if (!resourceMetrics) return [];
    return [
      { subject: 'Qubit Utilization', A: resourceMetrics.utilization, fullMark: 100 },
      { subject: 'Circuit Depth', A: Math.min(100, resourceMetrics.depth * 10), fullMark: 100 },
      { subject: 'Gate Overhead', A: Math.min(100, gates.length * 8), fullMark: 100 },
      { subject: 'Entanglement Ratio', A: Math.round((resourceMetrics.twoQubitGates / Math.max(1, gates.length)) * 100), fullMark: 100 },
      { subject: 'Simulation Memory', A: Math.min(100, Math.log2(resourceMetrics.estimatedQuantumMemoryBytes) * 10), fullMark: 100 },
    ];
  }, [resourceMetrics, gates]);

  // Grouped bar chart data: Quantum vs Classical resources (Phase 5)
  const classicalVsQuantumData = [
    { metric: 'Key Generation', Classical: 0.12, QuantumSim: 15.4 },
    { metric: 'Decapsulation/Sign', Classical: 0.28, QuantumSim: 24.2 },
    { metric: 'Verification', Classical: 0.18, QuantumSim: 12.8 },
  ];

  // Quantum vs Classical execution memory footprint (KB)
  const memoryComparisonData = [
    { name: 'Classical Key size', Classical: 2.4, QuantumSim: 0.25 },
    { name: 'Active Buffer size', Classical: 12.0, QuantumSim: 2.048 },
  ];

  const renderQuantumResourceAnalysis = () => {
    if (!results) {
      return (
        <Box sx={{
          mt: 4,
          p: 5,
          textAlign: 'center',
          bgcolor: 'rgba(28, 24, 20, 0.4)',
          borderRadius: '12px',
          border: '1px dashed rgba(180, 120, 70, 0.2)'
        }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
            Simulation Ready.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRunSimulation}
            startIcon={<RunIcon />}
          >
            Execute Simulation
          </Button>
        </Box>
      );
    }

    const metrics = resourceMetrics;
    if (!metrics) return null;

    // Donut chart data (Memory Allocation)
    const donutData = [
      { name: 'Private Key', value: metrics.privateKeySize },
      { name: 'Public Key', value: metrics.publicKeySize },
      { name: 'Ciphertext', value: metrics.ciphertextSize },
      { name: 'Signature', value: metrics.signatureSize },
      { name: 'Shared Secret', value: metrics.sharedSecretSize }
    ];

    const DONUT_COLORS = ['#CE9126', '#C9955F', '#E8C5A0', '#8A6D1F', '#3FA189'];

    // Gate distribution data
    const gateDistData = [
      { name: 'Hadamard (H)', count: gates.filter(g => g.type === 'H').length },
      { name: 'CNOT (CX)', count: gates.filter(g => g.type === 'CX').length },
      { name: 'Pauli-X (X)', count: gates.filter(g => g.type === 'X').length },
      { name: 'Pauli-Y (Y)', count: gates.filter(g => g.type === 'Y').length },
      { name: 'Pauli-Z (Z)', count: gates.filter(g => g.type === 'Z').length },
      { name: 'Phase (S)', count: gates.filter(g => g.type === 'S').length },
      { name: 'π/8 (T)', count: gates.filter(g => g.type === 'T').length },
      { name: 'Measure', count: 4 }
    ].filter(g => g.count > 0);

    // Radar Data
    const radarData = [
      { subject: 'Complexity', A: selectedLevel === 1 ? 50 : selectedLevel === 2 ? 75 : 95, fullMark: 100 },
      { subject: 'Memory', A: selectedLevel === 1 ? 40 : selectedLevel === 2 ? 65 : 90, fullMark: 100 },
      { subject: 'Execution Time', A: selectedLevel === 1 ? 30 : selectedLevel === 2 ? 60 : 95, fullMark: 100 },
      { subject: 'Security Strength', A: selectedLevel === 1 ? 50 : selectedLevel === 2 ? 75 : 100, fullMark: 100 },
      { subject: 'Resource Efficiency', A: selectedLevel === 1 ? 85 : selectedLevel === 2 ? 90 : 95, fullMark: 100 }
    ];

    // Stacked Bar Data
    const stackedBarData = [
      { category: 'Keys Memory', Classical: metrics.totalClassicalMemory, Quantum: metrics.estimatedQuantumMemoryBytes },
      { category: 'Working Buffer', Classical: metrics.estimatedWorkingMemory, Quantum: metrics.estimatedQuantumMemoryBytes * 2 }
    ];

    // Gate utilization matrix (Heatmap data)
    const heatMapRows = [
      { qubit: 'q_0', H: gates.filter(g => g.type === 'H' && g.qubits.includes(0)).length, CX: gates.filter(g => g.type === 'CX' && g.qubits.includes(0)).length, X: gates.filter(g => g.type === 'X' && g.qubits.includes(0)).length, Z: gates.filter(g => g.type === 'Z' && g.qubits.includes(0)).length, M: 1 },
      { qubit: 'q_1', H: gates.filter(g => g.type === 'H' && g.qubits.includes(1)).length, CX: gates.filter(g => g.type === 'CX' && g.qubits.includes(1)).length, X: gates.filter(g => g.type === 'X' && g.qubits.includes(1)).length, Z: gates.filter(g => g.type === 'Z' && g.qubits.includes(1)).length, M: 1 },
      { qubit: 'q_2', H: gates.filter(g => g.type === 'H' && g.qubits.includes(2)).length, CX: gates.filter(g => g.type === 'CX' && g.qubits.includes(2)).length, X: gates.filter(g => g.type === 'X' && g.qubits.includes(2)).length, Z: gates.filter(g => g.type === 'Z' && g.qubits.includes(2)).length, M: 1 },
      { qubit: 'q_3', H: gates.filter(g => g.type === 'H' && g.qubits.includes(3)).length, CX: gates.filter(g => g.type === 'CX' && g.qubits.includes(3)).length, X: gates.filter(g => g.type === 'X' && g.qubits.includes(3)).length, Z: gates.filter(g => g.type === 'Z' && g.qubits.includes(3)).length, M: 1 }
    ];

    // Line Chart Data
    const lineChartData = [
      { level: 'Level 1', latency: 12.4 },
      { level: 'Level 2', latency: 24.5 },
      { level: 'Level 3', latency: 48.2 }
    ];

    // Scatter plot data
    const scatterData = [
      { gates: 6, memory: 5652, name: 'Level 1' },
      { gates: 10, memory: 8004, name: 'Level 2' },
      { gates: 15, memory: 10926, name: 'Level 3' },
      { gates: metrics.gateCount, memory: metrics.totalClassicalMemory, name: 'Current Simulated' }
    ];

    return (
      <Box sx={{ mt: 5 }}>
        <Divider sx={{ mb: 4, borderColor: 'rgba(180, 120, 70, 0.2)' }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TrendingUpIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h2" component="h2" sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1.45rem', m: 0 }}>
              Quantum Resource Analysis
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Reference Hybrid Profile:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <Select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}
              >
                <MenuItem value={1}>Hybrid Level 1: ML-KEM-512 + ML-DSA-44</MenuItem>
                <MenuItem value={2}>Hybrid Level 2: ML-KEM-768 + ML-DSA-65 (Default)</MenuItem>
                <MenuItem value={3}>Hybrid Level 3: ML-KEM-1024 + ML-DSA-87</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* 1. Resource Summary Panel */}
        <Card sx={{ mb: 4, border: '1px solid rgba(180, 120, 70, 0.2)', background: 'linear-gradient(135deg, rgba(28,24,20,0.85) 0%, rgba(13,11,9,0.95) 100%)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <InfoIcon sx={{ color: '#CE9126' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Resource Summary Panel
              </Typography>
            </Box>
            <Grid container spacing={3.5}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Overall Resource Consumption</Typography>
                <Chip label={metrics.overallResourceConsumption} size="small" color={metrics.overallResourceConsumption === 'Low' ? 'success' : metrics.overallResourceConsumption === 'Medium' ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Overall Complexity</Typography>
                <Typography variant="body1" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'primary.main', fontWeight: 700 }}>{metrics.overallComplexity}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Overall Security Rating</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>{metrics.overallSecurityRating}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Quantum Readiness</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#C9955F' }}>{metrics.quantumReadiness}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Estimated Deployment Cost</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>{metrics.estimatedDeploymentCost}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Computational Overhead</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'warning.main' }}>{metrics.estimatedComputationalOverhead}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Recommended Enterprise Size</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>{metrics.recommendedEnterpriseSize}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Suitable For</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'secondary.main' }}>{metrics.suitableFor}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Classical Break Time</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.light', fontFamily: '"JetBrains Mono", monospace' }}>{metrics.classicalBreakTime}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Quantum Break Time</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.light', fontFamily: '"JetBrains Mono", monospace' }}>{metrics.quantumBreakTime}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 2. Resource Metrics (15 KPI Cards) */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
          Resource Metrics KPIs
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { title: "Number of Qubits", value: metrics.qubits, icon: <QuantumIcon />, color: "primary.main" },
            { title: "Number of Classical Bits", value: metrics.classicalBits, icon: <MemoryIcon />, color: "secondary.main" },
            { title: "Number of Quantum Gates", value: metrics.gateCount, icon: <CpuIcon />, color: "success.main" },
            { title: "Single-Qubit Gates", value: metrics.singleQubitGates, icon: <CpuIcon />, color: "info.main" },
            { title: "Two-Qubit Gates", value: metrics.twoQubitGates, icon: <CpuIcon />, color: "warning.main" },
            { title: "Circuit Depth", value: metrics.depth, icon: <TimelineIcon />, color: "error.main" },
            { title: "Est. Quantum Memory", value: metrics.estimatedQuantumMemory, icon: <RamIcon />, color: "primary.main" },
            { title: "Est. Classical Memory", value: metrics.estimatedClassicalMemory, icon: <MemoryIcon />, color: "secondary.main" },
            { title: "Est. Time Complexity", value: metrics.estimatedTimeComplexity, icon: <TimelineIcon />, color: "success.main" },
            { title: "Est. Space Complexity", value: metrics.estimatedSpaceComplexity, icon: <MemoryIcon />, color: "info.main" },
            { title: "Est. Quantum Exec Time", value: metrics.estimatedQuantumExecutionTime, icon: <SpeedIcon />, color: "warning.main" },
            { title: "Est. Classical Exec Time", value: metrics.estimatedClassicalExecutionTime, icon: <SpeedIcon />, color: "error.main" },
            { title: "Total Operations", value: metrics.totalOperations, icon: <AssessmentIcon />, color: "primary.main" },
            { title: "Gate Density", value: metrics.gateDensity, icon: <NetworkCheckIcon />, color: "secondary.main" },
            { title: "Resource Efficiency", value: metrics.resourceEfficiencyScore, icon: <TrendingUpIcon />, color: "success.main" },
          ].map((item, idx) => (
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={idx}>
              <Card sx={{ height: '100%', borderRadius: '10px' }}>
                <CardContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.72rem', lineHeight: 1.2 }}>
                      {item.title}
                    </Typography>
                    <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 16 } })}
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 'auto', color: 'text.primary', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.05rem' }}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 3. Complexity Analysis & Quantum Stats */}
        <Grid container spacing={3.5} sx={{ mb: 4 }}>
          {/* Complexity Analysis Panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <ShieldIcon sx={{ color: '#CE9126' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Complexity Analysis Panel
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {[
                    { label: "Time Complexity", value: metrics.timeComplexity, notation: "Asymptotic", desc: "Estimated runtime scaling" },
                    { label: "Space Complexity", value: metrics.spaceComplexity, notation: "Asymptotic", desc: "Memory growth scaling" },
                    { label: "Quantum Memory Complexity", value: metrics.quantumMemoryComplexity, notation: "Asymptotic", desc: "Logical qubit scaling" },
                    { label: "Communication Complexity", value: metrics.communicationComplexity, notation: "Asymptotic", desc: "Network transfer size" },
                    { label: "Security Strength", value: metrics.securityStrength, notation: "Practical", desc: "Post-quantum bit strength" },
                    { label: "Estimated Computational Cost", value: metrics.computationalCost, notation: "Practical", desc: "CPU/QPU overhead rating" }
                  ].map((c, i) => (
                    <Grid size={{ xs: 6 }} key={i}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.08)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{c.label}</Typography>
                        <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', my: 0.5, fontWeight: 700, color: 'primary.main', fontSize: '1.05rem' }}>
                          {c.value}
                        </Typography>
                        <Typography variant="caption" color="text.muted" sx={{ display: 'block', fontSize: '0.65rem' }}>{c.desc} ({c.notation})</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Quantum Circuit Statistics Panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <QuantumIcon sx={{ color: '#CE9126' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Quantum Circuit Statistics
                  </Typography>
                </Box>
                <TableContainer sx={{ border: '1px solid rgba(180, 120, 70, 0.1)', borderRadius: '8px' }}>
                  <Table size="small">
                    <TableBody>
                      {[
                        { name: "Circuit Width", value: `${metrics.circuitWidth} Qubits`, desc: "Total physical/logical channels" },
                        { name: "Circuit Depth", value: metrics.depth, desc: "Longest pathway of gates" },
                        { name: "Gate Count", value: metrics.gateCount, desc: "Sum of all active operations" },
                        { name: "Measurement Count", value: metrics.measurementCount, desc: "Projected measurement operations" },
                        { name: "Entanglement Count", value: metrics.entanglementCount, desc: "Number of multi-qubit CNOT gates" },
                        { name: "Gate Utilization", value: metrics.gateUtilization, desc: "Percentage of register active in gates" },
                        { name: "Average Gate Cost", value: metrics.avgGateCost, desc: "Average latency per gate operation" },
                        { name: "Estimated Fidelity", value: metrics.fidelity, desc: "Expected success probability of circuit" },
                        { name: "Execution Probability", value: metrics.executionProbability, desc: "Probability of correct final measurement outcome" }
                      ].map((row, idx) => (
                        <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600, py: 0.8, fontSize: '0.8rem' }}>{row.name}</TableCell>
                          <TableCell sx={{ py: 0.8, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main', fontWeight: 700, fontSize: '0.8rem' }} align="right">
                            {row.value}
                          </TableCell>
                          <TableCell sx={{ py: 0.8, fontSize: '0.7rem', color: 'text.muted' }}>{row.desc}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 4. Bits & Memory Analysis */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <MemoryIcon sx={{ color: '#CE9126' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Bits &amp; Memory Analysis
              </Typography>
            </Box>
            <Grid container spacing={3.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TableContainer sx={{ border: '1px solid rgba(180, 120, 70, 0.1)', borderRadius: '8px' }}>
                  <Table size="small">
                    <TableBody>
                      {[
                        { name: "Private Key Size", value: `${metrics.privateKeySize} Bytes` },
                        { name: "Public Key Size", value: `${metrics.publicKeySize} Bytes` },
                        { name: "Ciphertext Size", value: `${metrics.ciphertextSize} Bytes` },
                        { name: "Signature Size", value: `${metrics.signatureSize} Bytes` },
                        { name: "Shared Secret Size", value: `${metrics.sharedSecretSize} Bytes` },
                        { name: "Total Classical Memory", value: `${metrics.totalClassicalMemory} Bytes` },
                        { name: "Estimated Quantum Memory", value: `${metrics.estimatedQuantumMemoryBytes} Qubits` },
                        { name: "Estimated Working Memory", value: `${(metrics.estimatedWorkingMemory / 1024).toFixed(1)} KB` }
                      ].map((row, idx) => (
                        <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600, py: 1.1, fontSize: '0.8rem' }}>{row.name}</TableCell>
                          <TableCell sx={{ py: 1.1, fontFamily: '"JetBrains Mono", monospace', color: 'secondary.main', fontWeight: 700, fontSize: '0.8rem' }} align="right">
                            {row.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Horizontal Bar Chart (Key Sizes) */}
              <Grid size={{ xs: 12, md: 4 }}>
                <ChartWrapper title="Classical Key & Cipher Sizes (Bytes)" height={210}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Priv Key', size: metrics.privateKeySize },
                      { name: 'Pub Key', size: metrics.publicKeySize },
                      { name: 'Ciphertext', size: metrics.ciphertextSize },
                      { name: 'Signature', size: metrics.signatureSize }
                    ]} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" width={65} />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="size" fill="#C9955F" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </Grid>

              {/* Donut Chart (Memory Allocation) */}
              <Grid size={{ xs: 12, md: 4 }}>
                <ChartWrapper title="Memory Allocation Donut" height={210}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="bottom" height={20} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 5. Professional Dashboard Charts */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
          Analytical Dashboard Charts
        </Typography>
        <Grid container spacing={3.5} sx={{ mb: 4 }}>
          {/* Gate Distribution */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartWrapper title="Gate Distribution" height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gateDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis dataKey="name" tick={{ fill: '#9C9689', fontSize: 9 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis tick={{ fill: '#9C9689', fontSize: 9 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#CE9126" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Radar Chart */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartWrapper title="Algorithm Complexity Radar" height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(180, 120, 70, 0.12)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9C9689', fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#5C564B' }} stroke="rgba(180, 120, 70, 0.1)" />
                  <Radar name="Performance" dataKey="A" stroke="#C9955F" fill="#C9955F" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Stacked Bar Chart */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartWrapper title="Quantum vs Classical Memory Allocation" height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis dataKey="category" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Classical" name="Classical (Bytes)" stackId="a" fill="#8A6D1F" />
                  <Bar dataKey="Quantum" name="Quantum (Qubits)" stackId="a" fill="#3FA189" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Heat Map */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: 320, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, display: 'block' }}>
                  Gate Utilization Matrix (Heat Map)
                </Typography>
                <Box sx={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '70px repeat(5, 1fr)',
                  gridTemplateRows: 'repeat(5, 1fr)',
                  gap: '4px',
                  border: '1px solid rgba(180, 120, 70, 0.1)',
                  borderRadius: '8px',
                  p: 1.5,
                  bgcolor: 'rgba(0,0,0,0.2)'
                }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 10, color: 'text.secondary' }}>Qubit</Box>
                  {['H', 'CX', 'X', 'Z', 'M'].map(h => (
                    <Box key={h} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, color: 'text.secondary' }}>{h}</Box>
                  ))}
                  
                  {/* Rows */}
                  {heatMapRows.map(row => {
                    const getBgColor = (count) => {
                      if (count === 0) return 'rgba(180, 120, 70, 0.03)';
                      if (count === 1) return 'rgba(180, 120, 70, 0.2)';
                      if (count === 2) return 'rgba(180, 120, 70, 0.45)';
                      return 'rgba(180, 120, 70, 0.8)';
                    };
                    return (
                      <React.Fragment key={row.qubit}>
                        <Box sx={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}>{row.qubit}</Box>
                        {['H', 'CX', 'X', 'Z', 'M'].map(gate => {
                          const val = row[gate];
                          return (
                            <Tooltip title={`${row.qubit} has ${val} ${gate} gate(s)`} key={gate} arrow>
                              <Box sx={{
                                bgcolor: getBgColor(val),
                                border: '1px solid rgba(180, 120, 70, 0.15)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 700,
                                color: val > 0 ? '#FFF6C8' : 'rgba(255,255,255,0.15)',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  borderColor: '#CE9126',
                                  cursor: 'pointer'
                                }
                              }}>
                                {val}
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Line Chart */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartWrapper title="Execution Time vs Security Level (ms)" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis dataKey="level" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#CE9126" strokeWidth={2} dot={{ fill: '#CE9126', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Scatter Plot */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartWrapper title="Memory Usage vs Gate Count" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis type="number" dataKey="gates" name="Gates" unit=" gates" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis type="number" dataKey="memory" name="Memory" unit=" B" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                  <Scatter name="Profiles" data={scatterData} fill="#3FA189">
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name.includes('Current') ? '#CE9126' : '#C9955F'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>
        </Grid>

        {/* 6. Comparison Table */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
          Hybrid Security Profile Comparison
        </Typography>
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 2.5 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Security Profile</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Quantum Gates</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Qubits</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Circuit Depth</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Memory Usage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time Complexity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Space Complexity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estimated Runtime</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Security Strength</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>TLS Version</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Classical Resource</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Quantum Resource</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { name: "Hybrid Level 1", gates: 6, qubits: 4, depth: 4, mem: "5.6 KB", time: "O(N log N)", space: "O(N)", runtime: "12.4 ms", strength: "128 bits", tls: "TLS 1.3 / 1.2", classical: "3.2 KB key size", quantum: "256 Logical Qubits" },
                    { name: "Hybrid Level 2", gates: 10, qubits: 4, depth: 6, mem: "8.0 KB", time: "O(N log N)", space: "O(N)", runtime: "24.5 ms", strength: "192 bits", tls: "TLS 1.3", classical: "6.4 KB key size", quantum: "512 Logical Qubits" },
                    { name: "Hybrid Level 3", gates: 15, qubits: 4, depth: 9, mem: "10.9 KB", time: "O(N log N)", space: "O(N)", runtime: "48.2 ms", strength: "256 bits", tls: "TLS 1.3", classical: "12.8 KB key size", quantum: "1024 Logical Qubits" },
                  ].map((row, idx) => (
                    <TableRow key={idx} sx={{ bgcolor: row.name === `Hybrid Level ${selectedLevel}` ? 'rgba(206, 145, 38, 0.08)' : 'transparent' }}>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                        {row.name} {row.name === `Hybrid Level ${selectedLevel}` && <Chip label="Selected" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{row.gates}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{row.qubits}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{row.depth}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{row.mem}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>{row.time}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>{row.space}</TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{row.runtime}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.strength}</TableCell>
                      <TableCell>{row.tls}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.classical}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'primary.light' }}>{row.quantum}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <ExecutionScreen
      moduleKey="quantumSimulator"
      title="Quantum Threat Simulator"
      subtitle="Simulate a 4-qubit quantum register to audit algorithm complexities and assess quantum vulnerability profiles."
      duration={5000}
      buttonLabel="Start Quantum Threat Simulation"
      runSteps={[
        'Initializing register base state |0000>...',
        'Superposing register qubits with Hadamard gates...',
        'Creating Entanglement (CNOT)...',
        'Setting Oracle query targets...',
        'Amplify probability amplitude with Grover diffusion...',
        'Measuring register and collapsing wavefunctions...',
        'Synthesizing threat profile...'
      ]}
      assetCount={14}
    >
      <Box id="page-quantum-simulator" sx={{ py: 1.5 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <QuantumIcon sx={{ color: '#CE9126', fontSize: 28 }} />
          <Typography variant="h1" component="h1" className="heading-gradient">Quantum Circuit Simulator</Typography>
        </Box>
        <Typography variant="subtitle1">
          Simulate a 4-qubit quantum register to audit algorithm complexities and assess quantum vulnerability profiles
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(180, 120, 70, 0.15)', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newTab) => setActiveTab(newTab)}
          textColor="primary"
          indicatorColor="primary"
          aria-label="Quantum simulation sections"
        >
          <Tab label="Threat Simulation Lab" icon={<QuantumIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Attack Scenarios" icon={<ShieldIcon sx={{ fontSize: 18 }} />} iconPosition="start" disabled={stepperStage < 6 || !results} />
          <Tab label="Quantum Resource Analytics" icon={<MemoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" disabled={stepperStage < 6 || !results} />
          <Tab label="Quantum vs Classical" icon={<CompareIcon sx={{ fontSize: 18 }} />} iconPosition="start" disabled={stepperStage < 6 || !results} />
          <Tab label="Algorithm Comparison" icon={<AnalyticsIcon sx={{ fontSize: 18 }} />} iconPosition="start" disabled={stepperStage < 6 || !results} />
        </Tabs>
      </Box>

      {/* TAB 0: THREAT SIMULATION LAB */}
      {activeTab === 0 && (
        <>
          {/* 7-Step Quantum Cryptanalytic Attack Stepper */}
          <Box sx={{ mb: 4, p: 3, borderRadius: '12px', border: '1px solid rgba(180, 120, 70, 0.15)', bgcolor: 'rgba(20, 18, 15, 0.4)' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Quantum Attack Path Stepper (Simplified Grover / Shor Simulation)
            </Typography>
            <Grid container spacing={1} sx={{ position: 'relative', mb: 3 }}>
              {stepperStages.map((stage, idx) => {
                const isCompleted = idx < stepperStage;
                const isActive = idx === stepperStage;
                return (
                  <Grid xs={1.7} key={idx} sx={{ position: 'relative', textAlign: 'center' }}>
                    <Button
                      onClick={() => setStepperStage(idx)}
                      sx={{
                        minWidth: 0,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isActive ? '#CE9126' : isCompleted ? '#3FA189' : 'rgba(180, 120, 70, 0.2)',
                        bgcolor: isActive ? '#CE9126' : isCompleted ? 'rgba(63, 161, 137, 0.1)' : '#1C1814',
                        color: isActive ? '#000' : isCompleted ? '#3FA189' : 'rgba(255,255,255,0.4)',
                        fontWeight: 700,
                        '&:hover': {
                          borderColor: '#CE9126',
                          bgcolor: 'rgba(206, 145, 38, 0.15)'
                        }
                      }}
                    >
                      {idx + 1}
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: isActive ? 700 : 500, color: isActive ? '#FFF6C8' : 'text.secondary', fontSize: '0.7rem' }}>
                      {stage.title}
                    </Typography>
                  </Grid>
                );
              })}
            </Grid>
            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid #CE9126' }}>
              <Typography variant="body2" sx={{ color: '#FFF6C8', fontWeight: 600, mb: 0.5 }}>
                Stage {stepperStage + 1}: {stepperStages[stepperStage].title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stepperStages[stepperStage].desc}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3.5}>
            {/* Left Column: Threat Simulation Dashboard */}
            <Grid xs={12} md={4}>
              {stepperStage < 6 ? (
                <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2, minHeight: 300 }}>
                    <QuantumIcon sx={{
                      fontSize: 48,
                      color: 'text.secondary',
                      opacity: 0.4,
                      animation: 'spin 12s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}>
                      Simulation In Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
                      Please progress the cryptanalytic circuit to Stage 7 (Threat Analysis) to unlock the exposure scores.
                    </Typography>
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress variant="determinate" value={((stepperStage + 1) / 7) * 100} sx={{ height: 4, borderRadius: 2 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Stage {stepperStage + 1} of 7 Active
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 2.5, flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
                      Threat Simulation Dashboard
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid xs={12}>
                        <Box sx={{ p: 2, borderRadius: '8px', bgcolor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'error.light', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Quantum Threat Score
                            </Typography>
                            <Tooltip title="View scientific explanation & formula">
                              <IconButton
                                size="small"
                                onClick={() => setShowThreatInfo(!showThreatInfo)}
                                sx={{ color: 'error.light', p: 0.5 }}
                              >
                                <InfoIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 800, my: 0.5 }}>
                            92.4%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Critical Risk level (RSA/ECC keys vulnerable to collapse)
                          </Typography>

                          <Collapse in={showThreatInfo}>
                            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 700, mb: 1 }}>
                                Scientific Explanation
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1.5, lineHeight: 1.4 }}>
                                The Quantum Threat Score represents the estimated vulnerability of the currently detected classical cryptographic infrastructure against a fault-tolerant quantum computer executing Shor's algorithm.
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 700, mb: 0.5 }}>
                                Mathematical Formula:
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', color: '#FFF6C8', p: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: '4px', mb: 1.5 }}>
                                Threat Score = (Classical Assets / Total Cryptographic Assets) * Attack Success Factor
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 700, mb: 0.5 }}>
                                Security Scaling Matrix:
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                                • <strong>100% (RSA/ECC Reliance):</strong> Entire infrastructure depends on vulnerable classical public-key cryptography.<br />
                                • <strong>0% (Fully Modernized):</strong> Fully migrated to NIST standard PQC algorithms (ML-KEM + ML-DSA).<br />
                                • Hybrid deployments reduce the threat score proportionally.
                              </Typography>
                            </Box>
                          </Collapse>
                        </Box>
                      </Grid>
                      
                      <Grid xs={6}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.1)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Legacy Exposure
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#FFF6C8', fontWeight: 700, mt: 0.5 }}>
                            88.0%
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid xs={6}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.1)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Success Probability
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#CE9126', fontWeight: 700, mt: 0.5 }}>
                            94.0%
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid xs={12}>
                        <Divider sx={{ my: 1, borderColor: 'rgba(180, 120, 70, 0.1)' }} />
                      </Grid>
                      
                      <Grid xs={12}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.1)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                            Recommended PQC Level
                          </Typography>
                          <Chip label="NIST Level 3 (ML-KEM-768)" size="small" color="primary" sx={{ fontWeight: 700 }} />
                        </Box>
                      </Grid>
                      
                      <Grid xs={6}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.1)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Migration Urgency
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'error.light', fontWeight: 700, mt: 0.5 }}>
                            CRITICAL
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid xs={6}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(180, 120, 70, 0.1)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Readiness Score
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'success.light', fontWeight: 700, mt: 0.5 }}>
                            65% (Moderate)
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                        Active Register Status:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label="q_0 (Entangled)" size="small" color="secondary" sx={{ fontSize: '0.65rem', height: 22 }} />
                        <Chip label="q_1 (Entangled)" size="small" color="secondary" sx={{ fontSize: '0.65rem', height: 22 }} />
                        <Chip label="q_2 (Oracle Target)" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 22 }} />
                        <Chip label="q_3 (Superposition)" size="small" color="primary" sx={{ fontSize: '0.65rem', height: 22 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Right Column: Visualization & Execution Results */}
            <Grid xs={12} md={8}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
                      Quantum Circuit Schematic
                    </Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleRunSimulation()}
                      startIcon={<RunIcon />}
                      disabled={isRunning}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    >
                      {isRunning ? 'Executing...' : 'Execute Quantum Simulation'}
                    </Button>
                  </Box>

                  {/* SVG Circuit Visualizer */}
                  <Box sx={{
                    p: 2,
                    border: '1px solid rgba(180, 120, 70, 0.15)',
                    borderRadius: '10px',
                    bgcolor: 'rgba(20, 18, 15, 0.6)',
                    mb: 3,
                    minHeight: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflowX: 'auto'
                  }}>
                    {gates.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Register Initialized. No gates in circuit.</Typography>
                    ) : (
                      <Box sx={{ minWidth: Math.max(400, gates.length * 60 + 100), position: 'relative', height: 140 }}>
                        <svg width="100%" height="140" style={{ display: 'block' }}>
                          {/* Draw Qubit Lines */}
                          {[0, 1, 2, 3].map((q) => {
                            const y = 25 + q * 30;
                            return (
                              <g key={q}>
                                <text x="15" y={y + 4} fill="#FFF6C8" fontSize="12" fontFamily='"JetBrains Mono", monospace'>q_{q}</text>
                                <line x1="45" y1={y} x2="100%" y2={y} stroke="rgba(180, 120, 70, 0.25)" strokeWidth="1.5" />
                              </g>
                            );
                          })}

                          {/* Draw Gates */}
                          {gates.map((gate, idx) => {
                            const x = 70 + idx * 55;
                            if (gate.type === 'CX') {
                              const yCtrl = 25 + gate.qubits[0] * 30;
                              const yTgt = 25 + gate.qubits[1] * 30;
                              return (
                                <g key={idx}>
                                  <line x1={x} y1={yCtrl} x2={x} y2={yTgt} stroke="#CE9126" strokeWidth="2" strokeDasharray="3 2" />
                                  <circle cx={x} cy={yCtrl} r="4" fill="#CE9126" />
                                  <circle cx={x} cy={yTgt} r="8" fill="#1C1814" stroke="#CE9126" strokeWidth="2" />
                                  <line x1={x - 8} y1={yTgt} x2={x + 8} y2={yTgt} stroke="#CE9126" strokeWidth="1.5" />
                                  <line x1={x} y1={yTgt - 8} x2={x} y2={yTgt + 8} stroke="#CE9126" strokeWidth="1.5" />
                                </g>
                              );
                            } else {
                              const y = 25 + gate.qubits[0] * 30;
                              return (
                                <g key={idx}>
                                  <rect x={x - 12} y={y - 12} width="24" height="24" rx="4" fill="#C9955F" stroke="#E8C5A0" strokeWidth="1" />
                                  <text x={x} y={y + 4} fill="#0D0B09" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{gate.type}</text>
                                </g>
                              );
                            }
                          })}
                        </svg>
                      </Box>
                    )}
                  </Box>

                  {/* Probability Chart */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                    Quantum State Probability Distribution
                  </Typography>
                  {results ? (
                    <Box sx={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statevectorChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                          <XAxis dataKey="state" tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" />
                          <YAxis tick={{ fill: '#9C9689', fontSize: 10 }} stroke="rgba(180, 120, 70, 0.15)" unit="%" />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="probability" name="Probability" fill="#CE9126" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Box sx={{
                      flex: 1,
                      minHeight: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed rgba(180, 120, 70, 0.2)',
                      borderRadius: '8px',
                      bgcolor: 'rgba(0,0,0,0.1)'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Simulation not yet executed. Click "Execute Quantum Simulation" to run.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* TAB 1: ATTACK SCENARIOS */}
      {activeTab === 1 && (
        <Grid container spacing={3.5}>
          <Grid xs={12}>
            <Card sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                  Enterprise Attack Simulation Scenarios
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Compare how three different enterprise infrastructure scenarios respond to quantum cryptographic attacks (Shor's/Grover's algorithms).
                </Typography>

                <Grid container spacing={3}>
                  {/* Scenario A */}
                  <Grid xs={12} md={4}>
                    <Paper sx={{ p: 3, border: '1px solid rgba(239, 68, 68, 0.2)', bgcolor: 'rgba(239, 68, 68, 0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.light', mb: 1 }}>
                        Scenario A: Legacy Infrastructure
                      </Typography>
                      <Chip label="Critical Risk (98%)" size="small" color="error" sx={{ alignSelf: 'flex-start', fontWeight: 700, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Endpoints are protected solely by classical RSA-2048 and ECDSA P-256 signatures. High vulnerability to Shor's algorithm, allowing complete session handshake collapse and full decryption.
                      </Typography>
                      <Box sx={{ mt: 'auto', p: 1.5, borderRadius: '6px', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Active Ciphers</Typography>
                        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'error.light' }}>TLS_ECDHE_RSA_WITH_AES_128_GCM</Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Scenario B */}
                  <Grid xs={12} md={4}>
                    <Paper sx={{ p: 3, border: '1px solid rgba(245, 158, 11, 0.2)', bgcolor: 'rgba(245, 158, 11, 0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.light', mb: 1 }}>
                        Scenario B: Hybrid Deployment
                      </Typography>
                      <Chip label="Moderate Risk (15%)" size="small" color="warning" sx={{ alignSelf: 'flex-start', fontWeight: 700, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Endpoints run a dual-key structure combining classical algorithms and ML-KEM-768. Session encryption remains secure even if one constituent key collapses, dropping the success probability of quantum attack.
                      </Typography>
                      <Box sx={{ mt: 'auto', p: 1.5, borderRadius: '6px', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Active Ciphers</Typography>
                        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'warning.light' }}>TLS_hybrid_MLKEM768_ECDSA_AES256</Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Scenario C */}
                  <Grid xs={12} md={4}>
                    <Paper sx={{ p: 3, border: '1px solid rgba(16, 185, 129, 0.2)', bgcolor: 'rgba(16, 185, 129, 0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.light', mb: 1 }}>
                        Scenario C: Quantum Ready
                      </Typography>
                      <Chip label="Low Risk (0.8%)" size="small" color="success" sx={{ alignSelf: 'flex-start', fontWeight: 700, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        Fully modernized infrastructure utilizing standardized ML-KEM (FIPS 203) and ML-DSA (FIPS 204) for all digital handshakes and signatures. Attacks fail completely under known quantum cryptanalysis models.
                      </Typography>
                      <Box sx={{ mt: 'auto', p: 1.5, borderRadius: '6px', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Active Ciphers</Typography>
                        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'success.light' }}>TLS_MLKEM1024_MLDSA87_AES256_GCM</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: QUANTUM RESOURCE ANALYTICS */}
      {activeTab === 2 && renderQuantumResourceAnalysis()}

      {/* TAB 3: QUANTUM VS CLASSICAL */}
      {activeTab === 3 && (
        <Grid container spacing={3.5}>
          {/* Execution time comparison */}
          <Grid xs={12} md={6}>
            <ChartWrapper title="Execution Latency: Classical vs Quantum Simulation (ms)" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classicalVsQuantumData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis dataKey="metric" tick={{ fill: '#9C9689', fontSize: 11 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis tick={{ fill: '#9C9689', fontSize: 11 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend formatter={(val) => <span style={{ color: '#9C9689' }}>{val}</span>} />
                  <Bar dataKey="Classical" name="Classical / PQC CPU" fill="#3FA189" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="QuantumSim" name="Qiskit Simulation" fill="#CE9126" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Memory comparison */}
          <Grid xs={12} md={6}>
            <ChartWrapper title="Active Memory Allocation (KB)" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memoryComparisonData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.08)" />
                  <XAxis dataKey="name" tick={{ fill: '#9C9689', fontSize: 11 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <YAxis tick={{ fill: '#9C9689', fontSize: 11 }} stroke="rgba(180, 120, 70, 0.15)" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend formatter={(val) => <span style={{ color: '#9C9689' }}>{val}</span>} />
                  <Bar dataKey="Classical" name="Classical Space footprint" fill="#8A6D1F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="QuantumSim" name="Simulated Quantum Register" fill="#C9955F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Grid>

          {/* Security Levels Attack Resistance Heat Map */}
          <Grid xs={12}>
            <Card sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Cryptographic Quantum Vulnerability Heat Map
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This table maps different cryptographic algorithms against classic Shor's and Grover's attack vectors.
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Algorithm</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Bit Strength</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Classical Break Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Quantum Break Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Grover's Attack (Symmetric Speedup)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Shor's Attack (Asymmetric Collapse)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Quantum Standing</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {heatMapConfig.map((row) => (
                        <TableRow key={row.algo}>
                          <TableCell sx={{ py: 1.8, fontWeight: 600 }}>{row.algo}</TableCell>
                          <TableCell sx={{ py: 1.8, fontFamily: '"JetBrains Mono", monospace' }}>{row.security}</TableCell>
                          <TableCell sx={{ py: 1.8, fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>{row.classicalBreak}</TableCell>
                          <TableCell sx={{ py: 1.8, fontFamily: '"JetBrains Mono", monospace', color: row.quantumBreak.includes('<') ? 'error.light' : 'success.light' }}>{row.quantumBreak}</TableCell>
                          <TableCell sx={{ py: 1.8 }}>
                            <Chip
                              label={row.Grover}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                bgcolor: row.Grover === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: row.Grover === 'Critical' ? 'error.light' : 'success.light',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.8 }}>
                            <Chip
                              label={row.Shor}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                bgcolor: row.Shor === 'Vulnerable' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: row.Shor === 'Vulnerable' ? 'error.light' : 'success.light',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.8 }}>
                            <Chip
                              label={row.resistance}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                bgcolor: row.resistance === 'Legacy' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                                color: row.resistance === 'Legacy' ? 'warning.light' : 'success.main',
                                border: `1px solid ${row.resistance === 'Legacy' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 4: ALGORITHM COMPARISON */}
      {activeTab === 4 && (
        <Grid container spacing={3.5}>
          <Grid xs={12}>
            <Card sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <SpeedIcon sx={{ color: '#CE9126' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Algorithm Complexity &amp; Security Strength Analysis
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Post-quantum cryptographic algorithms are mathematically constructed on structured lattices (LWE) which do not possess the algebraic structures that Shor's algorithm exploits. Below is the comparative analysis.
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Algorithm Family</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Time Complexity (Classical)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Time Complexity (Quantum)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Space Complexity (Keys)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Quantum Security strength</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>RSA-2048 (Factoring)</TableCell>
                        <TableCell>Classical Key Exchange</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>exp(O(n^(1/3) log^(2/3) n))</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'error.light' }}>O(n^3)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(n)</TableCell>
                        <TableCell><Chip label="Broken" size="small" color="error" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>ECDH / ECDSA (DL)</TableCell>
                        <TableCell>Classical Elliptic Curve</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(sqrt(p))</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'error.light' }}>O(n^3)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(1)</TableCell>
                        <TableCell><Chip label="Broken" size="small" color="error" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>ML-KEM (LWE)</TableCell>
                        <TableCell>Post-Quantum Encryption</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(n^2)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'success.light' }}>O(n^2)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(n)</TableCell>
                        <TableCell><Chip label="NIST Level 1-5" size="small" color="success" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>ML-DSA (LWE)</TableCell>
                        <TableCell>Post-Quantum Signature</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(n^2)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'success.light' }}>O(n^2)</TableCell>
                        <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>O(n)</TableCell>
                        <TableCell><Chip label="NIST Level 1-5" size="small" color="success" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
    </ExecutionScreen>
  );
}

export default QuantumSimulator;
