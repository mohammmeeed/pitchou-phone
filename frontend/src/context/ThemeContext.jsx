import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('themeVersion_value') === 'theme-dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('theme-dark');
      localStorage.setItem('themeVersion_value', 'theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
      localStorage.setItem('themeVersion_value', '');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
