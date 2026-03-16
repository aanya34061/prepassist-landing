import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme_preference';

// ── Light Theme — PrepAssist Palette ─────────────────────────────
export const lightTheme = {
  mode: 'light' as const,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────────────────────
    background:       '#F5F1EB',  // Warm off-white from Double Spanish White
    backgroundAlt:    '#E6D1B5',  // Double Spanish White — section separators
    surface:          '#FFFFFF',  // Cards, modals, inputs
    surfaceSecondary: '#F0EAE0',  // Nested cards, tab bar, chip bg

    // ── Text ─────────────────────────────────────────────────────────────────
    text:          '#333333',  // Mine Shaft — primary text
    textSecondary: '#3D565E',  // Limed Spruce — subtitles
    textTertiary:  '#7A8A91',  // Muted teal-gray
    textInverse:   '#FFFFFF',  // On dark/primary backgrounds

    // ── Brand ────────────────────────────────────────────────────────────────
    primary:      '#2A7DEB',  // Royal Blue — primary accent
    primaryLight: '#E8F1FD',  // Light blue tint
    primaryMid:   '#5EC7B2',  // Downy — secondary teal accent
    secondary:    '#5EC7B2',  // Downy — teal highlights
    secondaryLight: '#E0F5F0',
    accent:       '#F6A30E',  // Buttercup — golden highlights
    accentLight:  '#FEF3D0',

    // ── Borders ──────────────────────────────────────────────────────────────
    border:       '#D9CFC2',  // Warm border
    borderLight:  '#E6D1B5',  // Double Spanish White
    borderStrong: '#B5A898',  // Strong warm border

    // ── Shadows / Overlay ────────────────────────────────────────────────────
    shadow:       'rgba(61,86,94,0.07)',
    shadowMedium: 'rgba(61,86,94,0.12)',
    overlay:      'rgba(51,51,51,0.45)',

    // ── Status ───────────────────────────────────────────────────────────────
    success:    '#5EC7B2',
    successBg:  '#E0F5F0',
    warning:    '#F6A30E',
    warningBg:  '#FEF3D0',
    error:      '#EF4444',
    errorBg:    '#FEE2E2',
    info:       '#2A7DEB',
    infoBg:     '#E8F1FD',

    // ── Icons ────────────────────────────────────────────────────────────────
    iconPrimary:  '#3D565E',
    iconSecondary: '#7A8A91',
    iconAccent:   '#2A7DEB',

    // ── Category colors ────────────────────────────────────────────────────
    ancient:       '#F6A30E',
    ancientBg:     '#FEF3D0',
    medieval:      '#5EC7B2',
    medievalBg:    '#E0F5F0',
    modern:        '#2A7DEB',
    modernBg:      '#E8F1FD',
    prehistoric:   '#78716C',
    prehistoricBg: '#F5F5F4',

    // ── Timeline ─────────────────────────────────────────────────────────────
    timelineLine:      '#D9CFC2',
    timelineDot:       '#2A7DEB',
    timelineDotActive: '#1A5DB8',

    // ── Subject colors ───────────────────────────────────────────────────────
    history:       '#F6A30E',
    historyBg:     '#FEF3D0',
    polity:        '#2A7DEB',
    polityBg:      '#E8F1FD',
    geography:     '#5EC7B2',
    geographyBg:   '#E0F5F0',
    economy:       '#F6A30E',
    economyBg:     '#FEF3D0',
    environment:   '#5EC7B2',
    environmentBg: '#E0F5F0',
    scitech:       '#2A7DEB',
    scitechBg:     '#E8F1FD',
  },

  gradients: {
    primary:     ['#2A7DEB', '#5EC7B2'] as string[],
    header:      ['#2A7DEB', '#1A5DB8'] as string[],
    card:        ['#FFFFFF', '#F5F1EB'] as string[],
    environment: ['#5EC7B2', '#4AB09D'] as string[],
    economy:     ['#F6A30E', '#F7B740'] as string[],
    scitech:     ['#2A7DEB', '#5EC7B2'] as string[],
    accent:      ['#F6A30E', '#F7B740'] as string[],
  },

  // ── Design tokens ──────────────────────────────────────────────────────────
  shadow: {
    card: {
      shadowColor:   '#3D565E',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius:  16,
      elevation:     4,
    },
    elevated: {
      shadowColor:   '#3D565E',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius:  24,
      elevation:     8,
    },
    primary: {
      shadowColor:   '#2A7DEB',
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius:  16,
      elevation:     6,
    },
  },

  radius: {
    sm:   8,
    md:   14,
    lg:   20,
    xl:   28,
    full: 999,
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },
};

// ── Dark Theme ────────────────────────────────────────────────────────────────
export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────────────────────
    background:       '#07091A',
    backgroundAlt:    '#0F1135',
    surface:          '#111328',
    surfaceSecondary: '#1A1D3F',

    // ── Text ─────────────────────────────────────────────────────────────────
    text:          '#F0F1FF',
    textSecondary: '#A8AACC',
    textTertiary:  '#6264A0',
    textInverse:   '#07091A',

    // ── Brand ────────────────────────────────────────────────────────────────
    primary:        '#818CF8',
    primaryLight:   '#1E1E5E',
    primaryMid:     '#6366F1',
    secondary:      '#38BDF8',
    secondaryLight: '#0C2A40',
    accent:         '#FBBF24',
    accentLight:    '#2D1D00',

    // ── Borders ──────────────────────────────────────────────────────────────
    border:       'rgba(255,255,255,0.10)',
    borderLight:  'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.18)',

    // ── Shadows / Overlay ────────────────────────────────────────────────────
    shadow:       'rgba(0,0,0,0.40)',
    shadowMedium: 'rgba(0,0,0,0.55)',
    overlay:      'rgba(0,0,0,0.70)',

    // ── Status ───────────────────────────────────────────────────────────────
    success:   '#34D399',
    successBg: '#052E16',
    warning:   '#FBBF24',
    warningBg: '#2D1D00',
    error:     '#F87171',
    errorBg:   '#2D0A0A',
    info:      '#38BDF8',
    infoBg:    '#0C2A40',

    // ── Icons ────────────────────────────────────────────────────────────────
    iconPrimary:   '#A8AACC',
    iconSecondary: '#6264A0',
    iconAccent:    '#818CF8',

    // ── Category colors ──────────────────────────────────────────────────────
    ancient:       '#FBBF24',
    ancientBg:     '#2D1D00',
    medieval:      '#A78BFA',
    medievalBg:    '#1E0D40',
    modern:        '#60A5FA',
    modernBg:      '#0C1F40',
    prehistoric:   '#A8A29E',
    prehistoricBg: '#1C1917',

    // ── Timeline ─────────────────────────────────────────────────────────────
    timelineLine:      'rgba(255,255,255,0.10)',
    timelineDot:       '#818CF8',
    timelineDotActive: '#A5B4FC',

    // ── Subject colors ───────────────────────────────────────────────────────
    history:       '#FBBF24',
    historyBg:     '#2D1D00',
    polity:        '#60A5FA',
    polityBg:      '#0C1F40',
    geography:     '#34D399',
    geographyBg:   '#052E16',
    economy:       '#FB923C',
    economyBg:     '#2D1000',
    environment:   '#4ADE80',
    environmentBg: '#052E16',
    scitech:       '#818CF8',
    scitechBg:     '#1E1E5E',
  },

  gradients: {
    primary:     ['#4F46E5', '#818CF8'] as string[],
    header:      ['#4338CA', '#6D28D9'] as string[],
    card:        ['#111328', '#1A1D3F'] as string[],
    environment: ['#22C55E', '#059669'] as string[],
    economy:     ['#EA580C', '#F97316'] as string[],
    scitech:     ['#4F46E5', '#7C3AED'] as string[],
    accent:      ['#F59E0B', '#FBBF24'] as string[],
  },

  shadow: {
    card: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius:  16,
      elevation:     6,
    },
    elevated: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.50,
      shadowRadius:  24,
      elevation:     10,
    },
    primary: {
      shadowColor:   '#4F46E5',
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.40,
      shadowRadius:  16,
      elevation:     8,
    },
  },

  radius: {
    sm:   8,
    md:   14,
    lg:   20,
    xl:   28,
    full: 999,
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },
};

export type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemePreference();
  }, []);

  const toggleTheme = useCallback(async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  }, [isDark]);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

