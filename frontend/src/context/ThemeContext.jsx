// frontend/src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

// Helper to calculate and apply dynamic CSS color variables across the public site
export function applyThemeColor(hex) {
  if (!hex || typeof hex !== 'string') return;

  let cleanHex = hex.trim();
  if (!cleanHex.startsWith('#')) cleanHex = `#${cleanHex}`;

  // Expand shorthand hex (#fff -> #ffffff)
  if (cleanHex.length === 4) {
    cleanHex = `#${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}${cleanHex[3]}${cleanHex[3]}`;
  }

  // Parse RGB
  const r = parseInt(cleanHex.slice(1, 3), 16) || 0;
  const g = parseInt(cleanHex.slice(3, 5), 16) || 0;
  const b = parseInt(cleanHex.slice(5, 7), 16) || 0;

  // Compute slight shift for attractive gradient (lighter/warmer accent)
  const shiftR = Math.min(255, Math.round(r * 1.15 + 15));
  const shiftG = Math.min(255, Math.round(g * 1.08 + 12));
  const shiftB = Math.min(255, Math.round(b * 0.92));
  const shiftHex = `#${shiftR.toString(16).padStart(2, '0')}${shiftG.toString(16).padStart(2, '0')}${shiftB.toString(16).padStart(2, '0')}`;

  // Darker variant for hover
  const hoverR = Math.max(0, Math.round(r * 0.85));
  const hoverG = Math.max(0, Math.round(g * 0.85));
  const hoverB = Math.max(0, Math.round(b * 0.85));
  const hoverHex = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;

  // Darker variant for primary-dark
  const darkR = Math.max(0, Math.round(r * 0.70));
  const darkG = Math.max(0, Math.round(g * 0.70));
  const darkB = Math.max(0, Math.round(b * 0.70));
  const darkHex = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;

  const root = document.documentElement;

  const primaryGradient = `linear-gradient(135deg, ${cleanHex} 0%, ${shiftHex} 100%)`;
  const primaryGradientVertical = `linear-gradient(180deg, ${shiftHex} 0%, ${cleanHex} 100%)`;

  // Apply to root CSS variables with !important to override static rules
  root.style.setProperty('--primary', cleanHex, 'important');
  root.style.setProperty('--primary-hover', hoverHex, 'important');
  root.style.setProperty('--primary-dark', darkHex, 'important');
  root.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.15)`, 'important');
  root.style.setProperty('--primary-gradient', primaryGradient, 'important');
  root.style.setProperty('--primary-gradient1', primaryGradientVertical, 'important');
  root.style.setProperty('--btn-gradient', primaryGradient, 'important');
  root.style.setProperty('--gradient1', primaryGradient, 'important');
  root.style.setProperty('--bg-gradient', `linear-gradient(0deg, ${cleanHex} 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)`, 'important');
  root.style.setProperty('--btn-shadow', `0px 10px 25px rgba(${r}, ${g}, ${b}, 0.35)`, 'important');

  // Bootstrap 5 compatibility
  root.style.setProperty('--bs-primary', cleanHex, 'important');
  root.style.setProperty('--bs-primary-rgb', `${r}, ${g}, ${b}`, 'important');

  // RGBA variations (from 0.1 to 0.9)
  for (let i = 1; i <= 9; i++) {
    root.style.setProperty(`--rgba-primary-${i}`, `rgba(${r}, ${g}, ${b}, ${(i / 10).toFixed(1)})`, 'important');
  }

  // Update browser mobile header theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', cleanHex);
  }

  // Persist locally
  try {
    localStorage.setItem('shop_accent_color', cleanHex);
  } catch (e) {}

  // Dispatch event so other components or tabs can react immediately
  window.dispatchEvent(new CustomEvent('shop_theme_color_changed', { detail: { color: cleanHex } }));
}

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('themeVersion_value') === 'theme-dark';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('shop_accent_color') || '#FF50A2';
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('theme-dark');
      localStorage.setItem('themeVersion_value', 'theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
      localStorage.setItem('themeVersion_value', '');
    }
  }, [darkMode]);

  // Load and apply color on mount & sync with Backend MySQL settings
  useEffect(() => {
    // 1. Immediately apply cached or default color
    const cachedColor = localStorage.getItem('shop_accent_color') || accentColor;
    applyThemeColor(cachedColor);

    // 2. Fetch active settings from PHP backend API
    const fetchBackendSettings = async () => {
      try {
        const res = await fetch('/api/parameters');
        if (res.ok) {
          const data = await res.json();
          const serverColor = data?.settings?.accent_color;
          if (serverColor && serverColor !== cachedColor) {
            setAccentColor(serverColor);
            applyThemeColor(serverColor);
          }
        }
      } catch (err) {
        // Backend offline or local fallback, keep cached color
      }
    };
    fetchBackendSettings();

    // 3. Listen to color change events within same window
    const handleColorChange = (e) => {
      if (e?.detail?.color) {
        setAccentColor(e.detail.color);
      }
    };

    // 4. Listen to storage changes from other tabs (e.g. admin panel in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'shop_accent_color' && e.newValue) {
        setAccentColor(e.newValue);
        applyThemeColor(e.newValue);
      }
    };

    window.addEventListener('shop_theme_color_changed', handleColorChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('shop_theme_color_changed', handleColorChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const updateAccentColor = useCallback((color) => {
    setAccentColor(color);
    applyThemeColor(color);
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, accentColor, updateAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
