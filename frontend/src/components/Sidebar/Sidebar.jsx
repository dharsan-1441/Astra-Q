import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  AccountTree as GraphIcon,
  Speed as BenchmarkIcon,
  VerifiedUser as CompatibilityIcon,
  Route as PlannerIcon,
  Assessment as ReportIcon,
  FactCheck as ReadinessIcon,
  Science as QuantumIcon,
  Transform as ConverterIcon,
} from '@mui/icons-material';
import { NAVBAR_HEIGHT } from '../Navbar/Navbar';
import { usePipeline } from '../../context/PipelineContext';

const SIDEBAR_WIDTH = 250; // Spacious layout

const navSections = [
  {
    title: 'Overview',
    items: [
      { id: 'nav-dashboard', label: 'Dashboard', icon: DashboardIcon, path: '/' },
    ],
  },
  {
    title: 'Discovery',
    items: [
      { id: 'nav-converter', label: 'Configuration Converter', icon: ConverterIcon, path: '/converter' },
      { id: 'nav-discovery', label: 'Enterprise Discovery', icon: SearchIcon, path: '/discovery' },
      { id: 'nav-dependency-graph', label: 'Dependency Graph', icon: GraphIcon, path: '/dependency-graph' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { id: 'nav-benchmark', label: 'Benchmark', icon: BenchmarkIcon, path: '/benchmark' },
      { id: 'nav-readiness', label: 'Readiness', icon: ReadinessIcon, path: '/readiness' },
      { id: 'nav-quantum', label: 'Quantum Threat & PQC Simulator', icon: QuantumIcon, path: '/quantum-simulator' },
      { id: 'nav-compatibility', label: 'Compatibility', icon: CompatibilityIcon, path: '/compatibility' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'nav-planner', label: 'Migration Planner', icon: PlannerIcon, path: '/planner' },
      { id: 'nav-report', label: 'Audit Report', icon: ReportIcon, path: '/report' },
    ],
  },
];


function Sidebar({ mobileOpen, onMobileClose }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { activeProfile } = usePipeline();

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        pt: `${NAVBAR_HEIGHT}px`,
        backgroundColor: '#14120F', // warm dark surface
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {navSections.map((section, sIdx) => (
          <Box key={section.title} sx={{ mb: 1.5 }}>
            <Typography
              variant="overline"
              sx={{
                px: 3,
                py: 1,
                display: 'block',
                fontSize: '0.75rem', // 12px
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#9C9689', // textSecondary
                opacity: 0.6,
              }}
            >
              {section.title}
            </Typography>

            <List disablePadding sx={{ px: 1.5 }}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <ListItemButton
                    id={item.id}
                    key={item.path}
                    selected={isActive}
                    onClick={() => handleNavigation(item.path)}
                    aria-label={`Navigate to ${item.label}`}
                    aria-current={isActive ? 'page' : undefined}
                    sx={{
                      mb: '3px',
                      py: 1,
                      px: 2,
                      borderRadius: '10px',
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      '& .MuiListItemIcon-root': {
                        color: isActive ? '#C9955F' : '#5C564B',
                        minWidth: 36,
                      },
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9375rem', // EXACTLY 15px
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#FFF6C8' : '#9C9689',
                      },
                      '&:hover': {
                        transform: 'translateX(3px)',
                        backgroundColor: 'rgba(201, 149, 95, 0.05)',
                        '& .MuiListItemIcon-root': {
                          color: '#C9955F',
                        },
                        '& .MuiListItemText-primary': {
                          color: '#FFF6C8',
                        },
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(201, 149, 95, 0.08)',
                        borderLeft: '3px solid #C9955F',
                        '&:hover': {
                          backgroundColor: 'rgba(201, 149, 95, 0.12)',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Icon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>

            {sIdx < navSections.length - 1 && (
              <Divider sx={{ mx: 3, my: 1, borderColor: 'rgba(180, 120, 70, 0.1)' }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Footer status box */}
      <Box sx={{ p: 2.5, borderTop: '1px solid rgba(180, 120, 70, 0.1)' }}>
        <Box
          sx={{
            p: 2,
            borderRadius: '10px',
            border: '1px solid rgba(201, 149, 95, 0.2)',
            bgcolor: 'rgba(201, 149, 95, 0.04)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#9C9689', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}
          >
            Migration Target
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: '#C9955F', fontSize: '0.875rem', mt: 0.5 }}
          >
            {activeProfile}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: '#9C9689', fontSize: '0.75rem', display: 'block', mt: 0.25, opacity: 0.8 }}
          >
            NIST Standard Profile
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            borderRight: '1px solid rgba(180, 120, 70, 0.1)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            borderRight: '1px solid rgba(180, 120, 70, 0.1)',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export { Sidebar, SIDEBAR_WIDTH };
export default Sidebar;
