import { createTheme, alpha } from '@mui/material/styles';

// ─── CyberSecurity-DarkGold Design Tokens ────────────────────────────────────
const COLORS = {
  // Backgrounds
  bgDeep: '#0D0B09',
  bgSurface: '#14120F',
  bgCard: '#1C1814',
  bgElevated: '#28221B',

  // Primary (Gold/Bronze Gradient components)
  primary: '#C9955F',
  primaryLight: '#E8C5A0',
  primaryDark: '#B17D4A',

  // Secondary (Gold accents)
  secondary: '#CE9126',
  secondaryLight: '#E8A33D',
  secondaryDark: '#8A6D1F',

  // Semantic
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  error: '#EF4444',
  errorLight: '#F87171',
  errorDark: '#DC2626',
  info: '#6366F1',
  infoLight: '#818CF8',
  infoDark: '#4F46E5',

  // Typography
  textPrimary: '#FFF6C8', // Warm light gold
  textSecondary: '#9C9689', // Body text color
  textDisabled: '#5C564B',

  // Borders & Dividers
  border: 'rgba(180, 120, 70, 0.15)',
  borderLight: 'rgba(180, 120, 70, 0.08)',
  borderHover: 'rgba(180, 120, 70, 0.35)',
  divider: 'rgba(180, 120, 70, 0.12)',
};

const shadows = [
  'none',
  '0 1px 2px rgba(0,0,0,0.4)',
  '0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  '0 4px 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
  '0 6px 12px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.3)',
  '0 8px 16px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)',
  '0 12px 24px rgba(0,0,0,0.6), 0 6px 12px rgba(0,0,0,0.4)',
  ...Array(18).fill('0 12px 24px rgba(0,0,0,0.6), 0 6px 12px rgba(0,0,0,0.4)'),
];

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: COLORS.primary,
      light: COLORS.primaryLight,
      dark: COLORS.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.secondary,
      light: COLORS.secondaryLight,
      dark: COLORS.secondaryDark,
      contrastText: '#0D0B09',
    },
    background: {
      default: COLORS.bgDeep,
      paper: COLORS.bgSurface,
    },
    success: {
      main: COLORS.success,
      light: COLORS.successLight,
      dark: COLORS.successDark,
    },
    warning: {
      main: COLORS.warning,
      light: COLORS.warningLight,
      dark: COLORS.warningDark,
    },
    error: {
      main: COLORS.error,
      light: COLORS.errorLight,
      dark: COLORS.errorDark,
    },
    info: {
      main: COLORS.info,
      light: COLORS.infoLight,
      dark: COLORS.infoDark,
    },
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
      disabled: COLORS.textDisabled,
    },
    divider: COLORS.divider,
    action: {
      hover: 'rgba(180, 120, 70, 0.05)',
      selected: alpha(COLORS.primary, 0.1),
      focus: alpha(COLORS.primary, 0.15),
    },
  },

  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, -apple-system, sans-serif',
    h1: {
      fontSize: '1.75rem', // 28px (Page titles / Dashboard main title)
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h2: {
      fontSize: '1.5rem', // 24px (Report headings)
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.35,
    },
    h3: {
      fontSize: '1.25rem', // 20px (Section titles)
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.125rem', // 18px (Card titles)
      fontWeight: 600,
      letterSpacing: '-0.005em',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.9375rem', // 15px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      color: COLORS.textSecondary,
      lineHeight: 1.6,
    },
    subtitle2: {
      fontSize: '0.9375rem', // 15px
      fontWeight: 500,
      color: COLORS.textSecondary,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem', // 16px (Body text, Navigation, Buttons)
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem', // 15px (Tables)
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '1rem', // 16px
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
      color: COLORS.textSecondary,
    },
    overline: {
      fontSize: '0.8125rem', // 13px
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
  },

  shape: {
    borderRadius: 10, // 10px rounded corners globally (cards, buttons, etc.)
  },

  shadows,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.bgDeep,
          scrollbarColor: `${alpha(COLORS.primary, 0.3)} transparent`,
          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(COLORS.primary, 0.2),
            borderRadius: 3,
            '&:hover': {
              background: alpha(COLORS.primary, 0.4),
            },
          },
        },
        '*': {
          scrollbarWidth: 'thin',
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          fontSize: '0.9375rem', // 15px
          fontWeight: 600,
          transition: 'all 200ms ease',
          minHeight: 38,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #C9955F 0%, #B17D4A 100%)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #D4A36E 0%, #C08A56 100%)',
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 14px ${alpha(COLORS.primary, 0.4)}`,
          },
        },
        outlinedSecondary: {
          background: 'transparent',
          border: '1px solid rgba(180, 120, 70, 0.45)',
          color: '#FFFFFF',
          '&:hover': {
            borderColor: 'rgba(180, 120, 70, 0.75)',
            backgroundColor: alpha(COLORS.primary, 0.05),
          },
        },
        outlined: {
          borderColor: COLORS.border,
          color: COLORS.textSecondary,
          '&:hover': {
            borderColor: COLORS.borderHover,
            backgroundColor: alpha(COLORS.primary, 0.05),
            color: COLORS.textPrimary,
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
          minHeight: 30,
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: COLORS.bgSurface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
        },
      },
    },

    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: COLORS.bgSurface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          transition: 'all 200ms ease',
          '&:hover': {
            borderColor: COLORS.borderHover,
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px ${alpha(COLORS.primary, 0.03)}`,
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.bgSurface,
          borderColor: COLORS.border,
          borderRadius: 0,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(84, 78, 60, 0.35)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'none',
          borderRadius: 0,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 0',
          padding: '10px 14px',
          transition: 'all 200ms ease',
          '&.Mui-selected': {
            backgroundColor: alpha(COLORS.primary, 0.08),
            borderLeft: `3px solid ${COLORS.primary}`,
            color: COLORS.textPrimary,
            '&:hover': {
              backgroundColor: alpha(COLORS.primary, 0.12),
            },
          },
          '&:hover': {
            backgroundColor: alpha(COLORS.primary, 0.04),
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.8125rem',
          height: 28,
        },
        outlined: {
          borderColor: COLORS.border,
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.75rem',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          fontSize: '0.8125rem',
          padding: '10px 14px',
          boxShadow: shadows[4],
        },
        arrow: {
          color: COLORS.bgElevated,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: COLORS.divider,
          padding: '16px 20px',
          fontSize: '0.9375rem', // 15px Tables range
        },
        head: {
          fontWeight: 600,
          fontSize: '0.875rem',
          color: COLORS.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          backgroundColor: alpha(COLORS.bgCard, 0.5),
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 200ms ease',
          '&:hover': {
            backgroundColor: alpha(COLORS.primary, 0.04),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(COLORS.primary, 0.08),
            '&:hover': {
              backgroundColor: alpha(COLORS.primary, 0.12),
            },
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 1.5,
          backgroundColor: COLORS.primary,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9375rem',
          minHeight: 44,
          padding: '10px 20px',
          transition: 'color 200ms ease',
          color: COLORS.textSecondary,
          '&.Mui-selected': {
            color: COLORS.textPrimary,
          },
        },
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bgSurface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px !important',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: 0,
          },
        },
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 52,
          padding: '0 24px',
          '&.Mui-expanded': {
            minHeight: 52,
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem',
        },
        outlined: {
          backgroundColor: alpha(COLORS.primary, 0.02),
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: alpha(COLORS.primary, 0.12),
        },
        bar: {
          borderRadius: 3,
          background: 'linear-gradient(90deg, #C9955F 0%, #CE9126 100%)',
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '0.9375rem',
            '& fieldset': {
              borderColor: COLORS.border,
              transition: 'border-color 200ms ease',
            },
            '&:hover fieldset': {
              borderColor: COLORS.borderHover,
            },
            '&.Mui-focused fieldset': {
              borderColor: COLORS.primary,
              borderWidth: 1,
            },
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.9375rem',
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: COLORS.divider,
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          boxShadow: shadows[6],
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          padding: '10px 20px',
          transition: 'background-color 150ms ease',
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 6,
        },
      },
    },
  },
});

export { COLORS };
export default theme;
