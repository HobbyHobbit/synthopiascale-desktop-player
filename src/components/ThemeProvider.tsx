import { useEffect } from 'react';
import { useThemeStore, applyThemeToDocument } from '../store/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { getTheme, currentThemeId } = useThemeStore();

  useEffect(() => {
    const theme = getTheme();
    applyThemeToDocument(theme);
  }, [currentThemeId, getTheme]);

  return <>{children}</>;
}
