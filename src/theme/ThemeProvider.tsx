import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { getSetting, setSetting } from '../db/database';
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
  useEffect(() => {
    getSetting('theme_mode')
      .then((savedMode) => {
        if (savedMode === 'light' || savedMode === 'dark') setMode(savedMode);
      })
      .catch(() => undefined);
  }, []);
  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      toggleMode: () =>
        setMode((current) => {
          const next = current === 'dark' ? 'light' : 'dark';
          void setSetting('theme_mode', next);
          return next;
        }),
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
