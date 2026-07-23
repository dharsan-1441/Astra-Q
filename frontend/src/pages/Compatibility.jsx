import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  useTheme,
  alpha,
  Paper,
  Button,
} from '@mui/material';
import {
  VerifiedUser as CompatibilityIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Build as ToolIcon,
  Schedule as PendingIcon,
  Terminal as CodeIcon,
  CloudQueue as CloudIcon,
  Dns as OsIcon,
  SettingsInputComponent as LibraryIcon,
  Router as RouterIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

// Data models
const VENDOR_MATRIX = [
  {
    vendor: 'Amazon Web Services',
    category: 'Cloud Provider',
    product: 'AWS KMS',
    mlKem: 'Stable',
    mlKemVersion: 'Hybrid TLS & KMS Keys',
    mlDsa: 'Beta',
    mlDsaVersion: 'Preview Signatures',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Q4 2026',
    notes: 'Native support for Hybrid key agreements (X25519 + Kyber).',
  },
  {
    vendor: 'Google Cloud Platform',
    category: 'Cloud Provider',
    product: 'Cloud KMS / ALTS',
    mlKem: 'Stable',
    mlKemVersion: 'Native KEM support',
    mlDsa: 'Beta',
    mlDsaVersion: 'Preview API',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Q1 2027',
    notes: 'Internal traffic secured with hybrid PQC key exchange by default.',
  },
  {
    vendor: 'Microsoft Azure',
    category: 'Cloud Provider',
    product: 'Azure Key Vault',
    mlKem: 'Beta',
    mlKemVersion: 'Managed HSM integration',
    mlDsa: 'Roadmap',
    mlDsaVersion: 'Q3 2026',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Q2 2027',
    notes: 'Undergoing NIST FIPS validation for HSM firmware updates.',
  },
  {
    vendor: 'Cloudflare',
    category: 'Cloud Provider',
    product: 'Cloudflare Edge / CDN',
    mlKem: 'Stable',
    mlKemVersion: 'Kyber768 / X25519-Kyber768',
    mlDsa: 'Stable',
    mlDsaVersion: 'PQC Certificates',
    slhDsa: 'Beta',
    slhDsaVersion: 'Edge verification',
    notes: 'Enabled post-quantum key exchange for all free/paid accounts natively.',
  },
  {
    vendor: 'OpenSSL',
    category: 'Crypto Library',
    product: 'OpenSSL v3.0+',
    mlKem: 'Compatible',
    mlKemVersion: 'via oqs-provider',
    mlDsa: 'Compatible',
    mlDsaVersion: 'via oqs-provider',
    slhDsa: 'Compatible',
    slhDsaVersion: 'via oqs-provider',
    notes: 'Requires compiling the liboqs helper library and injecting the OQS provider module.',
  },
  {
    vendor: 'Bouncy Castle',
    category: 'Crypto Library',
    product: 'Bouncy Castle Java (v1.73+)',
    mlKem: 'Stable',
    mlKemVersion: 'Native API',
    mlDsa: 'Stable',
    mlDsaVersion: 'Native API',
    slhDsa: 'Stable',
    slhDsaVersion: 'Native API',
    notes: 'Full support for ML-KEM and ML-DSA standards in the Java provider.',
  },
  {
    vendor: 'Red Hat Enterprise Linux',
    category: 'Operating System',
    product: 'RHEL 9.4+',
    mlKem: 'Beta',
    mlKemVersion: 'Technology Preview',
    mlDsa: 'Roadmap',
    mlDsaVersion: 'Fedora 40 upstream',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Planning phase',
    notes: 'Includes tech-preview of OpenSSH and GnuTLS PQC modules.',
  },
  {
    vendor: 'Microsoft Windows Server',
    category: 'Operating System',
    product: 'Windows Server 2025',
    mlKem: 'Beta',
    mlKemVersion: 'Schannel preview',
    mlDsa: 'Roadmap',
    mlDsaVersion: 'Schannel roadmap',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Not planned',
    notes: 'Schannel support for Kyber hybrid TLS is in development builds.',
  },
  {
    vendor: 'Cisco Systems',
    category: 'Network Appliance',
    product: 'IOS-XE / ASA',
    mlKem: 'Beta',
    mlKemVersion: 'IPSec VPN Hybrid',
    mlDsa: 'Roadmap',
    mlDsaVersion: 'Code-signing preview',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Under evaluation',
    notes: 'Post-Quantum hybrid key exchange for site-to-site tunnels is in beta.',
  },
  {
    vendor: 'Palo Alto Networks',
    category: 'Network Appliance',
    product: 'PAN-OS 11+',
    mlKem: 'Roadmap',
    mlKemVersion: 'Q4 2026 TLS Decryption',
    mlDsa: 'Roadmap',
    mlDsaVersion: 'FIPS 204 roadmap',
    slhDsa: 'Roadmap',
    slhDsaVersion: 'Not planned',
    notes: 'Investigating Kyber decryption capabilities for inline SSL inspection.',
  },
];

const COMPATIBILITY_RULES = {
  openssl: {
    name: 'OpenSSL',
    category: 'Crypto Library',
    algorithms: {
      'ml-kem': {
        status: 'Compatible',
        minVersion: '3.0.0 + oqs-provider',
        guide: 'Compile liboqs, install openssl oqs-provider extension, and register the provider in openssl.cnf.',
        code: `# Add to openssl.cnf:\n[provider_sect]\ndefault = default_sect\noqsprovider = oqsprovider_sect\n\n[oqsprovider_sect]\nactivate = 1`,
      },
      'ml-dsa': {
        status: 'Compatible',
        minVersion: '3.0.0 + oqs-provider',
        guide: 'Compile liboqs with ML-DSA enablement, register oqsprovider in OpenSSL configs.',
        code: `# Generate ML-DSA-65 keys:\nopenssl genpkey -algorithm mldsa65 -out mldsa_private.pem`,
      },
    },
  },
  jdk: {
    name: 'Java Development Kit (JDK)',
    category: 'Crypto Library',
    algorithms: {
      'ml-kem': {
        status: 'Stable',
        minVersion: 'JDK 21 + Bouncy Castle 1.77',
        guide: 'Register BouncyCastleProvider at runtime or in java.security file.',
        code: `// Add provider dynamically\nSecurity.addProvider(new BouncyCastleProvider());\nKeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM-768", "BC");\nKeyPair kp = kpg.generateKeyPair();`,
      },
      'ml-dsa': {
        status: 'Stable',
        minVersion: 'JDK 21 + Bouncy Castle 1.77',
        guide: 'Full FIPS 204 signature compatibility with BouncyCastle signature classes.',
        code: `Signature sig = Signature.getInstance("ML-DSA-65", "BC");\nsig.initSign(privateKey);\nsig.update(payloadData);\nbyte[] signature = sig.sign();`,
      },
    },
  },
  aws: {
    name: 'AWS SDK & KMS',
    category: 'Cloud Provider',
    algorithms: {
      'ml-kem': {
        status: 'Stable',
        minVersion: 'AWS SDK v2.24+',
        guide: 'Configure client builder to enable PQ hybrid cipher suites (e.g. ECDH + ML-KEM).',
        code: `// Enable TLS Hybrid Key Agreement\nKmsClient kmsClient = KmsClient.builder()\n    .httpClientBuilder(AwsApacheSdkHttpService.builder())\n    .build();`,
      },
      'ml-dsa': {
        status: 'Beta',
        minVersion: 'AWS KMS Endpoint Preview',
        guide: 'Configure asymmetric key creation to use PQC signature types.',
        code: `# AWS CLI create-key preview\naws kms create-key --key-usage SIGN_VERIFY --customer-master-key-spec ML_DSA_65`,
      },
    },
  },
  openssh: {
    name: 'OpenSSH client / daemon',
    category: 'Operating System',
    algorithms: {
      'ml-kem': {
        status: 'Stable',
        minVersion: 'OpenSSH 9.0+',
        guide: 'Set key exchange algorithms to use s2n-pq KEX or hybrid Kyber-X25519 methods.',
        code: `# Add to sshd_config or ssh_config:\nKexAlgorithms sntrup761x25519-sha512@openssh.com,mlkem768x25519-sha512@openssh.com`,
      },
      'ml-dsa': {
        status: 'Beta',
        minVersion: 'OpenSSH 9.5+',
        guide: 'Use hybrid post-quantum host keys / public key auth. (Technology Preview)',
        code: `# Generate ML-DSA host keys:\nssh-keygen -t mldsa65 -f /etc/ssh/ssh_host_mldsa_key`,
      },
    },
  },
};

function Compatibility() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus } = usePipeline();

  useEffect(() => {
    if (pipelineState.yamlImport === 'completed' && pipelineState.compatibility === 'idle') {
      updateStepStatus('compatibility', 'completed');
    }
  }, [pipelineState.yamlImport, pipelineState.compatibility]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Interactive Tester States
  const [testVendor, setTestVendor] = useState('openssl');
  const [testAlgo, setTestAlgo] = useState('ml-kem');

  const categories = ['All', 'Cloud Provider', 'Crypto Library', 'Operating System', 'Network Appliance'];

  // Status Badge Mapper
  const getStatusChip = (status) => {
    let color = 'default';
    let icon = <PendingIcon sx={{ fontSize: 14 }} />;

    if (status === 'Stable') {
      color = 'success';
      icon = <CheckIcon sx={{ fontSize: 14 }} />;
    } else if (status === 'Compatible') {
      color = 'info';
      icon = <CheckIcon sx={{ fontSize: 14 }} />;
    } else if (status === 'Beta') {
      color = 'warning';
      icon = <WarningIcon sx={{ fontSize: 14 }} />;
    } else if (status === 'Roadmap') {
      color = 'default';
      icon = <PendingIcon sx={{ fontSize: 14 }} />;
    }

    return (
      <Chip
        label={status}
        color={color}
        size="small"
        icon={icon}
        sx={{
          height: 22,
          fontWeight: 600,
          fontSize: '0.6875rem',
          borderRadius: '10px',
        }}
      />
    );
  };

  // Filter Vendor Matrix
  const filteredMatrix = useMemo(() => {
    return VENDOR_MATRIX.filter((item) => {
      const matchesSearch =
        item.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Compute test report card
  const testReport = useMemo(() => {
    const vendorRules = COMPATIBILITY_RULES[testVendor];
    if (!vendorRules) return null;
    const algoRule = vendorRules.algorithms[testAlgo];
    if (!algoRule) {
      return {
        status: 'Roadmap',
        minVersion: 'N/A',
        guide: 'Compatibility criteria or migration path is currently under evaluation by the security planning team.',
        code: '# No integration script available.',
      };
    }
    return algoRule;
  }, [testVendor, testAlgo]);

  return (
    <ExecutionScreen
      moduleKey="compatibility"
      title="Compatibility Support Hub"
      subtitle="Evaluate enterprise systems, network appliances, and libraries for PQC standard readiness."
      duration={3000}
      buttonLabel="Run Compatibility Analysis"
      runSteps={[
        'Parsing Cipher Suites...',
        'Analyzing Client Handshakes...',
        'Cross-referencing Cryptographic Standard matrix...',
        'Compiling Compliance Statuses...'
      ]}
      assetCount={14}
    >
      <Box id="page-compatibility" sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {/* Header Panel */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <CompatibilityIcon sx={{ color: '#CE9126', fontSize: 28 }} />
              <Typography variant="h2" component="h1" className="heading-gradient">
                Compatibility Support Hub
              </Typography>
            </Box>
            <Typography variant="subtitle1">
              Evaluate enterprise systems, network appliances, and libraries for PQC standard readiness.
            </Typography>
          </Box>
        </Box>

        {/* Grid: Matrix + Interactive Tester */}
        <Grid container spacing={3.5}>
          {/* Support Matrix List */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.5),
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  VENDOR &amp; PLATFORM SUPPORT MATRIX
                </Typography>

                {/* Filters */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    size="small"
                    placeholder="Search matrix..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 180 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 16 }} />
                          </InputAdornment>
                        ),
                      }
                    }}
                  />

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="category-filter-label">Category</InputLabel>
                    <Select
                      labelId="category-filter-label"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      label="Category"
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <TableContainer sx={{ flexGrow: 1, maxHeight: 520, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}>
                    <TableRow>
                      <TableCell sx={{ pl: 2.5, fontSize: '0.9375rem' }}>Platform / Vendor</TableCell>
                      <TableCell sx={{ fontSize: '0.9375rem' }}>Product</TableCell>
                      <TableCell sx={{ fontSize: '0.9375rem' }}>ML-KEM (KEM)</TableCell>
                      <TableCell sx={{ fontSize: '0.9375rem' }}>ML-DSA (Sign)</TableCell>
                      <TableCell sx={{ pr: 2.5, fontSize: '0.9375rem' }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMatrix.map((item, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ pl: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {item.category === 'Cloud Provider' && <CloudIcon sx={{ fontSize: 16, color: '#C9955F' }} />}
                            {item.category === 'Operating System' && <OsIcon sx={{ fontSize: 16, color: '#CE9126' }} />}
                            {item.category === 'Crypto Library' && <LibraryIcon sx={{ fontSize: 16, color: '#C9955F' }} />}
                            {item.category === 'Network Appliance' && <RouterIcon sx={{ fontSize: 16, color: '#F59E0B' }} />}
                            <Box>
                              <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.9375rem' }}>
                                {item.vendor}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {item.category}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.product}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {getStatusChip(item.mlKem)}
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', pl: 0.5 }}>
                              {item.mlKemVersion}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {getStatusChip(item.mlDsa)}
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', pl: 0.5 }}>
                              {item.mlDsaVersion}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ pr: 2.5, color: 'text.secondary', fontSize: '0.9375rem', maxWidth: 220 }}>
                          {item.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMatrix.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: '0.9375rem' }}>
                          No compatibility matrix matches found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          {/* Interactive Compatibility Config Tester */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: alpha(theme.palette.background.paper, 0.5),
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  INTERACTIVE COMPATIBILITY CHECKER
                </Typography>
              </Box>

              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.9375rem' }}>
                  Select your system component and PQC cryptographic algorithm standard to generate compliance statuses and config rules.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="test-vendor-label">System Platform</InputLabel>
                    <Select
                      labelId="test-vendor-label"
                      value={testVendor}
                      onChange={(e) => setTestVendor(e.target.value)}
                      label="System Platform"
                    >
                      <MenuItem value="openssl">OpenSSL Engine</MenuItem>
                      <MenuItem value="jdk">Java (JDK / BouncyCastle)</MenuItem>
                      <MenuItem value="aws">AWS SDK &amp; KMS</MenuItem>
                      <MenuItem value="openssh">OpenSSH (Client / Daemon)</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel id="test-algo-label">Algorithm Standard</InputLabel>
                    <Select
                      labelId="test-algo-label"
                      value={testAlgo}
                      onChange={(e) => setTestAlgo(e.target.value)}
                      label="Algorithm Standard"
                    >
                      <MenuItem value="ml-kem">ML-KEM (Kyber Key Encapsulation)</MenuItem>
                      <MenuItem value="ml-dsa">ML-DSA (Dilithium Signatures)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Compatibility Result Card */}
                {testReport && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Compliance Status
                      </Typography>
                      {getStatusChip(testReport.status)}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <InfoIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      <Typography variant="body1" sx={{ fontSize: '0.9375rem' }}>
                        <strong>Min version required:</strong> {testReport.minVersion}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: 'rgba(201, 149, 95, 0.03)', border: `1px solid ${theme.palette.divider}`, borderRadius: '10px' }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: 'text.primary' }}>
                        <ToolIcon sx={{ fontSize: 14, color: '#C9955F' }} /> Migration Guide
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '0.9375rem', color: 'text.secondary' }}>
                        {testReport.guide}
                      </Typography>
                    </Box>

                    {/* Config Snippet */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.primary' }}>
                        <CodeIcon sx={{ fontSize: 14, color: '#CE9126' }} /> Integration Snippet
                      </Typography>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          backgroundColor: '#0D0B09',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: '10px',
                          overflowX: 'auto',
                        }}
                      >
                        <Typography
                          variant="body1"
                          component="pre"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                            color: '#FFFFFF',
                            m: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}
                        >
                          {testReport.code}
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ExecutionScreen>
  );
}

export default Compatibility;
