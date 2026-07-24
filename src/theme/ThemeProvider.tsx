import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { darkColors, lightColors, ThemeColors } from './tokens';

type Mode = 'light' | 'dark';
interface ThemeContextValue {
  mode: Mode;
  colors: ThemeColors;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode,
}: PropsWithChildren<{ initialMode: Mode }>) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
