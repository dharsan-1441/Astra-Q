import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  TextField,
  Chip,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  alpha,
  Paper
} from '@mui/material';
import {
  UploadFile as UploadIcon,
  Transform as ConverterIcon,
  Download as DownloadIcon,
  Input as ImportIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Build as AutoFixIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  FilePresent as FileIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import * as yaml from 'js-yaml';
import { discoveryService } from '../api/services';
import { usePipeline } from '../context/PipelineContext';

// Schema metadata
const VALID_SYSTEM_TYPES = [
  'server', 'client', 'database', 'load_balancer', 'firewall', 'vpn', 
  'hsm', 'pki', 'iot', 'embedded', 'gateway', 'proxy', 'controller', 
  'mail', 'dns', 'cache', 'monitoring', 'other'
];

const VALID_CRITICALITY_LEVELS = ['critical', 'high', 'medium', 'low', 'unknown'];

export default function ConfigurationConverter() {
  const theme = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { updateStepStatus, fetchInventory } = usePipeline();

  // App States
  const [file, setFile] = useState(null);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Conversion States
  const [enterpriseName, setEnterpriseName] = useState('Converted Enterprise Network');
  const [enterpriseDomain, setEnterpriseDomain] = useState('internal.local');
  const [enterpriseEnv, setEnterpriseEnv] = useState('Production');
  
  const [rawParsedData, setRawParsedData] = useState(null);
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [validationIssues, setValidationIssues] = useState([]);
  const [conversionProgress, setConversionProgress] = useState(0);

  // File selection handler
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  // Detect format & trigger parsing
  const processSelectedFile = (selectedFile) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setSuccessMsg(null);
    setRawParsedData(null);
    setGeneratedYaml('');
    setValidationIssues([]);
    setConversionProgress(0);

    const filename = selectedFile.name.toLowerCase();
    let format = 'unknown';

    if (filename.endsWith('.json')) format = 'JSON';
    else if (filename.endsWith('.csv')) format = 'CSV';
    else if (filename.endsWith('.xml')) format = 'XML';
    else if (filename.endsWith('.txt')) format = 'TXT';
    else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) format = 'XLSX';
    else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) format = 'YAML';

    setDetectedFormat(format);
  };

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) return [];
    
    // Split headers handling optional quotes
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  // Parse XML
  const parseXML = (text) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    // Check for XML parsing error
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      throw new Error(parseError[0].textContent);
    }

    // Try to find systems or general tags
    let systemNodes = xmlDoc.getElementsByTagName('system');
    if (systemNodes.length === 0) {
      systemNodes = xmlDoc.getElementsByTagName('asset');
    }
    if (systemNodes.length === 0) {
      systemNodes = xmlDoc.getElementsByTagName('item');
    }
    if (systemNodes.length === 0 && xmlDoc.documentElement) {
      systemNodes = xmlDoc.documentElement.children;
    }

    const systems = [];
    for (let i = 0; i < systemNodes.length; i++) {
      const node = systemNodes[i];
      const obj = {};
      for (let j = 0; j < node.children.length; j++) {
        const child = node.children[j];
        // If child has subchildren (like certificate), parse them
        if (child.children.length > 0) {
          const subObj = {};
          for (let k = 0; k < child.children.length; k++) {
            const subChild = child.children[k];
            subObj[subChild.nodeName] = subChild.textContent;
          }
          obj[child.nodeName] = subObj;
        } else {
          obj[child.nodeName] = child.textContent;
        }
      }
      systems.push(obj);
    }
    return systems;
  };

  // Parse TXT Key-Value Blocks
  const parseTXT = (text) => {
    const blocks = text.split(/\r?\n\r?\n/);
    const systems = [];
    
    blocks.forEach((block) => {
      const lines = block.split(/\r?\n/);
      const obj = {};
      lines.forEach((line) => {
        const parts = line.split(/[:=]/);
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join('=').trim();
          obj[key] = val;
        }
      });
      if (Object.keys(obj).length > 0) {
        systems.push(obj);
      }
    });
    return systems;
  };

  // Run Conversion Process
  const handleConvert = async () => {
    if (!file) {
      setErrorMsg('Please upload a file first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConversionProgress(20);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const result = e.target.result;
        let parsedList = [];
        setConversionProgress(40);

        if (detectedFormat === 'JSON') {
          const data = JSON.parse(result);
          if (Array.isArray(data)) {
            parsedList = data;
          } else if (data.systems && Array.isArray(data.systems)) {
            parsedList = data.systems;
          } else if (data.enterprise && data.enterprise.systems && Array.isArray(data.enterprise.systems)) {
            parsedList = data.enterprise.systems;
            if (data.enterprise.name) setEnterpriseName(data.enterprise.name);
            if (data.enterprise.domain) setEnterpriseDomain(data.enterprise.domain);
            if (data.enterprise.environment) setEnterpriseEnv(data.enterprise.environment);
          } else {
            throw new Error('JSON structure must be an array of systems or contain a "systems" key.');
          }
        } 
        else if (detectedFormat === 'CSV') {
          parsedList = parseCSV(result);
        } 
        else if (detectedFormat === 'XML') {
          parsedList = parseXML(result);
        } 
        else if (detectedFormat === 'TXT') {
          parsedList = parseTXT(result);
        } 
        else if (detectedFormat === 'XLSX') {
          const workbook = XLSX.read(new Uint8Array(result), { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedList = XLSX.utils.sheet_to_json(worksheet);
        } 
        else if (detectedFormat === 'YAML') {
          const data = yaml.load(result);
          if (data && data.enterprise && Array.isArray(data.enterprise.systems)) {
            parsedList = data.enterprise.systems;
            if (data.enterprise.name) setEnterpriseName(data.enterprise.name);
            if (data.enterprise.domain) setEnterpriseDomain(data.enterprise.domain);
            if (data.enterprise.environment) setEnterpriseEnv(data.enterprise.environment);
          } else if (Array.isArray(data)) {
            parsedList = data;
          } else if (data && Array.isArray(data.systems)) {
            parsedList = data.systems;
          } else {
            throw new Error('YAML must contain a top-level "enterprise" block with "systems", or be a list.');
          }
        }

        if (parsedList.length === 0) {
          throw new Error('No system entries could be parsed from the configuration.');
        }

        setConversionProgress(60);
        setRawParsedData(parsedList);
        generateAndValidateYAML(parsedList);

      } catch (err) {
        console.error(err);
        setErrorMsg(`Parsing failed: ${err.message || 'Check your file formatting and syntax.'}`);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read the uploaded file.');
      setLoading(false);
    };

    if (detectedFormat === 'XLSX') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Mappings helper
  const mapFields = (rawList) => {
    return rawList.map((item, idx) => {
      const getVal = (keys) => {
        for (const k of keys) {
          const matchKey = Object.keys(item).find(rawKey => {
            const normRaw = rawKey.toLowerCase().replace(/[\s_-]/g, '');
            const normTarget = k.toLowerCase().replace(/[\s_-]/g, '');
            return normRaw === normTarget;
          });
          if (matchKey !== undefined && item[matchKey] !== undefined && item[matchKey] !== null) {
            return item[matchKey];
          }
        }
        return undefined;
      };

      // ID
      let id = getVal(['id', 'system_id', 'asset_id', 'uuid', 'uid']);
      // Name
      let name = getVal(['name', 'system_name', 'label', 'title', 'asset_name']);
      // Hostname
      let hostname = getVal(['hostname', 'server_name', 'machine', 'host', 'domain_name']);
      // IP
      let ip = getVal(['ip', 'ip_address', 'address', 'host_ip']);
      
      // Port
      let portVal = getVal(['port', 'port_number', 'service_port']);
      let port = undefined;
      if (portVal !== undefined && portVal !== '') {
        port = parseInt(portVal, 10);
        if (isNaN(port)) port = undefined;
      }

      // OS
      let operating_system = getVal(['operating_system', 'os', 'platform', 'kernel', 'os_version']);
      // Crypto algorithm
      let crypto_algorithm = getVal(['crypto_algorithm', 'crypto', 'cipher', 'algorithm', 'cipher_suite', 'cryptographic_algorithm']);
      // TLS version
      let tls_version = getVal(['tls_version', 'tls', 'ssl', 'protocol', 'tls_protocol']);
      
      // Legacy
      let legacyVal = getVal(['legacy', 'deprecated', 'is_legacy', 'old']);
      let legacy = legacyVal !== undefined ? (String(legacyVal).toLowerCase() === 'true' || legacyVal === true) : false;

      // Criticality
      let criticalityVal = getVal(['criticality', 'priority', 'severity', 'tier']);
      let criticality = 'unknown';
      if (criticalityVal) {
        const cStr = String(criticalityVal).toLowerCase().trim();
        if (VALID_CRITICALITY_LEVELS.includes(cStr)) {
          criticality = cStr;
        }
      }

      // Dependencies
      let depVal = getVal(['dependencies', 'depends_on', 'connections', 'links', 'dep']);
      let dependencies = [];
      if (Array.isArray(depVal)) {
        dependencies = depVal.map(d => String(d).trim());
      } else if (depVal) {
        dependencies = String(depVal).split(/[,;|]/).map(d => d.trim()).filter(Boolean);
      }

      // Owner & Notes
      let owner = getVal(['owner', 'team', 'manager', 'contact']);
      let notes = getVal(['notes', 'description', 'info', 'comment']);

      // Certificate
      let certIssuer = getVal(['certificate_issuer', 'cert_issuer', 'issuer']);
      let certSubject = getVal(['certificate_subject', 'cert_subject', 'subject']);
      let certExpiry = getVal(['certificate_expiry', 'cert_expiry', 'expiry', 'expiration']);
      let certAlgo = getVal(['certificate_algorithm', 'cert_algorithm', 'cert_crypto']);
      let certSerial = getVal(['certificate_serial', 'cert_serial_number', 'serial', 'serial_number']);

      let certificate = undefined;
      if (certIssuer || certSubject || certExpiry || certAlgo || certSerial) {
        certificate = {
          issuer: certIssuer || null,
          subject: certSubject || null,
          expiry: certExpiry || null,
          algorithm: certAlgo || null,
          serial_number: certSerial ? String(certSerial) : null
        };
      }

      // Fallbacks
      if (!name && hostname) name = hostname;
      if (!name && ip) name = `IP-${ip}`;
      if (!name) name = `Asset-${idx + 1}`;

      if (!id) {
        id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      }
      id = String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      // Type
      let typeVal = getVal(['type', 'system_type', 'category', 'role', 'asset_type']);
      let type = 'server';
      if (typeVal) {
        const tStr = String(typeVal).toLowerCase().replace(/[\s_-]/g, '_');
        if (VALID_SYSTEM_TYPES.includes(tStr)) {
          type = tStr;
        } else {
          const matched = VALID_SYSTEM_TYPES.find(vt => tStr.includes(vt) || vt.includes(tStr));
          if (matched) type = matched;
        }
      }

      const entry = {
        id,
        name,
        type,
        hostname: hostname || null,
        ip: ip || null,
        port: port || null,
        operating_system: operating_system || null,
        crypto_algorithm: crypto_algorithm || null,
        tls_version: tls_version || null,
        dependencies,
        criticality,
        owner: owner || null,
        notes: notes || null,
        legacy
      };

      if (certificate) {
        entry.certificate = certificate;
      }

      return entry;
    });
  };

  // Schema Validator & Generator
  const generateAndValidateYAML = (parsedList) => {
    setConversionProgress(80);
    const mapped = mapFields(parsedList);

    const finalConfig = {
      enterprise: {
        name: enterpriseName,
        domain: enterpriseDomain || null,
        environment: enterpriseEnv || null,
        systems: mapped
      }
    };

    // Serialize to YAML
    const yamlString = yaml.dump(finalConfig, { indent: 2, lineWidth: -1 });
    setGeneratedYaml(yamlString);

    // Validation checks
    const issues = [];
    const ids = new Set();

    mapped.forEach((sys, idx) => {
      // ID uniqueness
      if (ids.has(sys.id)) {
        issues.push({
          type: 'error',
          ref: `System ${idx + 1} (${sys.name})`,
          msg: `Duplicate system ID: "${sys.id}". Every system must have a unique identifier.`
        });
      } else {
        ids.add(sys.id);
      }

      // Required fields checks
      if (!sys.id) {
        issues.push({ type: 'error', ref: `System ${idx + 1}`, msg: 'Missing required field "id".' });
      }
      if (!sys.name) {
        issues.push({ type: 'error', ref: `System ${idx + 1}`, msg: 'Missing required field "name".' });
      }
      if (!sys.type) {
        issues.push({ type: 'error', ref: `System ${idx + 1}`, msg: 'Missing required field "type".' });
      } else if (!VALID_SYSTEM_TYPES.includes(sys.type)) {
        issues.push({
          type: 'warning',
          ref: sys.id || `System ${idx + 1}`,
          msg: `Invalid system type "${sys.type}". Recommended standard: ${VALID_SYSTEM_TYPES.join(', ')}.`
        });
      }

      // Criticality check
      if (sys.criticality && !VALID_CRITICALITY_LEVELS.includes(sys.criticality)) {
        issues.push({
          type: 'warning',
          ref: sys.id || `System ${idx + 1}`,
          msg: `Invalid criticality level "${sys.criticality}". Must be one of: ${VALID_CRITICALITY_LEVELS.join(', ')}.`
        });
      }

      // Dependencies array type check
      if (!Array.isArray(sys.dependencies)) {
        issues.push({
          type: 'warning',
          ref: sys.id || `System ${idx + 1}`,
          msg: 'Dependencies field must be a list of strings.'
        });
      }
    });

    setValidationIssues(issues);
    setConversionProgress(100);
    setSuccessMsg(`Successfully converted and validated ${mapped.length} assets!`);
  };

  // Auto-Fix Warnings and Errors
  const handleAutoFix = () => {
    if (!rawParsedData) return;

    setLoading(true);
    try {
      const mapped = mapFields(rawParsedData);
      const usedIds = new Set();
      
      const fixed = mapped.map((sys, idx) => {
        // Fix duplicate/missing IDs
        let uniqueId = sys.id;
        if (!uniqueId || usedIds.has(uniqueId)) {
          const cleanName = sys.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          uniqueId = `${cleanName || 'sys'}-${idx + 1}`;
        }
        usedIds.add(uniqueId);

        // Fix type
        let fixedType = sys.type;
        if (!VALID_SYSTEM_TYPES.includes(fixedType)) {
          fixedType = 'server'; // default fallback
        }

        // Fix criticality
        let fixedCrit = sys.criticality;
        if (!VALID_CRITICALITY_LEVELS.includes(fixedCrit)) {
          fixedCrit = 'unknown'; // default fallback
        }

        // Fix dependencies structure
        let fixedDeps = sys.dependencies;
        if (!Array.isArray(fixedDeps)) {
          fixedDeps = [];
        }

        return {
          ...sys,
          id: uniqueId,
          type: fixedType,
          criticality: fixedCrit,
          dependencies: fixedDeps
        };
      });

      // Update name parameters
      generateAndValidateYAML(fixed);
      setSuccessMsg('Auto-Fix applied! All formatting, IDs, types, and nesting schema conflicts resolved.');
    } catch (err) {
      console.error(err);
      setErrorMsg(`Auto-Fix failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Download YAML file
  const handleDownload = () => {
    if (!generatedYaml) return;
    const blob = new Blob([generatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${enterpriseName.toLowerCase().replace(/[\s_-]/g, '_')}_inventory.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct Import into existing Enterprise Discovery module
  const handleImport = async () => {
    if (!generatedYaml) return;
    
    // Check if there are blocking error level issues
    const hasErrors = validationIssues.some(issue => issue.type === 'error');
    if (hasErrors) {
      setErrorMsg('Please resolve all error-level validation issues before importing.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const blob = new Blob([generatedYaml], { type: 'text/yaml' });
      const fileObj = new File([blob], 'converted_enterprise.yaml', { type: 'text/yaml' });
      
      const formData = new FormData();
      formData.append('file', fileObj);

      const response = await discoveryService.importYaml(formData);
      
      setSuccessMsg(response.data.message || 'Successfully imported inventory directly!');
      
      // Update Context States
      updateStepStatus('yamlImport', 'completed');
      updateStepStatus('discovery', 'completed');
      
      // Fetch latest assets and navigate to Discovery View
      await fetchInventory();
      
      setTimeout(() => {
        navigate('/discovery');
      }, 1500);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to submit inventory file to Discovery pipeline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ConverterIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h2" component="h1" className="heading-gradient">
              Enterprise Configuration Converter
            </Typography>
          </Box>
          <Typography variant="subtitle1">
            Convert custom XML, CSV, JSON, TXT, or Excel network sheets to standard compliant enterprise YAML schemas.
          </Typography>
        </Box>
      </Box>

      {/* Alert Notices */}
      {errorMsg && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: '10px' }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" variant="outlined" sx={{ borderRadius: '10px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Workspace Grid */}
      <Grid container spacing={3.5}>
        
        {/* Left Control Card: Upload, Format & Mapping */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Step 1: Upload Card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                  1. UPLOAD NETWORK INVENTORY
                </Typography>
                
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: dragOver ? '#CE9126' : 'rgba(180, 120, 70, 0.25)',
                    borderRadius: '12px',
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: dragOver ? 'rgba(206, 145, 38, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#CE9126',
                      bgcolor: 'rgba(206, 145, 38, 0.02)'
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,.csv,.xml,.txt,.xlsx,.xls,.yaml,.yml"
                    style={{ display: 'none' }}
                  />
                  <UploadIcon sx={{ fontSize: 48, color: '#C9955F', mb: 1.5 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                    {file ? file.name : 'Select or Drop file here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supports JSON, CSV, XML, TXT, Excel (XLSX), or YAML
                  </Typography>
                </Box>

                {file && (
                  <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#1D1914', borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FileIcon sx={{ color: '#CE9126' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setFile(null)}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Enterprise Metadata & Conversion Actions */}
            {file && (
              <Card>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                    2. METADATA & PARSING
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Detected Format:</Typography>
                    <Chip
                      label={detectedFormat}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Enterprise Name"
                      value={enterpriseName}
                      onChange={(e) => setEnterpriseName(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Domain"
                      value={enterpriseDomain}
                      onChange={(e) => setEnterpriseDomain(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Environment"
                      value={enterpriseEnv}
                      onChange={(e) => setEnterpriseEnv(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Box>

                  {loading ? (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Analyzing and mapping schema...
                      </Typography>
                      <LinearProgress value={conversionProgress} variant="determinate" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConvert}
                      startIcon={<ConverterIcon />}
                      fullWidth
                    >
                      Convert to YAML Schema
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validation Issues Panel */}
            {generatedYaml && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                      SCHEMA VALIDATION
                    </Typography>
                    <Chip
                      label={validationIssues.length === 0 ? 'VALID' : `${validationIssues.length} ISSUES`}
                      color={validationIssues.length === 0 ? 'success' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  {validationIssues.length === 0 ? (
                    <Alert severity="success" icon={<SuccessIcon />} variant="outlined" sx={{ borderRadius: '10px' }}>
                      ✓ The generated YAML complies fully with the standard enterprise discovery schema.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <List sx={{ maxHeight: 220, overflowY: 'auto', bgcolor: '#0D0B09', borderRadius: '8px', p: 1 }}>
                        {validationIssues.map((issue, index) => (
                          <ListItem key={index} sx={{ py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              {issue.type === 'error' ? (
                                <ErrorIcon color="error" sx={{ fontSize: 18 }} />
                              ) : (
                                <WarningIcon color="warning" sx={{ fontSize: 18 }} />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: issue.type === 'error' ? '#EF4444' : '#F59E0B' }}>
                                  {issue.ref}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                                  {issue.msg}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<AutoFixIcon />}
                        onClick={handleAutoFix}
                        fullWidth
                      >
                        Auto Fix & Re-Validate
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

          </Box>
        </Grid>

        {/* Right Preview Panel: YAML Output & Discovery Trigger */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', minHeight: 650, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                p: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                GENERATED YAML PREVIEW
              </Typography>

              {generatedYaml && (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    size="small"
                  >
                    Download
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ImportIcon />}
                    onClick={handleImport}
                    size="small"
                    disabled={validationIssues.some(i => i.type === 'error') || loading}
                  >
                    Import into Discovery
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#0D0B09', position: 'relative' }}>
              {generatedYaml ? (
                <textarea
                  value={generatedYaml}
                  readOnly
                  style={{
                    width: '100%',
                    height: '100%',
                    flexGrow: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#FFF6C8',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    resize: 'none',
                    outline: 'none',
                    padding: '8px',
                    whiteSpace: 'pre',
                    overflowY: 'auto'
                  }}
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 2, color: 'text.secondary' }}>
                  <ConverterIcon sx={{ fontSize: 64, color: 'rgba(180, 120, 70, 0.15)' }} />
                  <Typography variant="body1">Upload and convert an inventory file to preview generated YAML.</Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
