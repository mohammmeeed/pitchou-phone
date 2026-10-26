// frontend/src/components/F12Blocker.jsx
// Système de blocage de la touche F12 et des outils d'inspection
// Activé via la case à cocher "Bloquer F12" dans les paramètres d'administration

import { useEffect, useState } from 'react';

export default function F12Blocker() {
  const [isBlocked, setIsBlocked] = useState(() => {
    try {
      return localStorage.getItem('block_f12') === '1';
    } catch {
      return false;
    }
  });

  // 1. Synchronisation avec le backend et les événements locaux
  useEffect(() => {
    // Vérifier les paramètres du serveur
    const checkServerSettings = async () => {
      try {
        const res = await fetch('/api/parameters');
        if (res.ok) {
          const data = await res.json();
          if (data?.settings?.block_f12 !== undefined) {
            const active = String(data.settings.block_f12) === '1';
            setIsBlocked(active);
            try {
              localStorage.setItem('block_f12', active ? '1' : '0');
            } catch {}
          }
        }
      } catch (err) {
        // En cas de mode hors ligne, la valeur du localStorage reste active
      }
    };

    checkServerSettings();

    // Écouter les changements en direct depuis AdminParameter
    const handleCustomChange = (e) => {
      const active = String(e.detail) === '1';
      setIsBlocked(active);
    };

    // Écouter les changements depuis un autre onglet
    const handleStorageChange = (e) => {
      if (e.key === 'block_f12') {
        setIsBlocked(e.newValue === '1');
      }
    };

    window.addEventListener('block_f12_changed', handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('block_f12_changed', handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 2. Interception stricte de F12 et des raccourcis DevTools
  useEffect(() => {
    if (!isBlocked) return;

    const handleKeyDown = (e) => {
      const key = e.key;
      const keyCode = e.keyCode || e.which;

      // Touche F12
      const isF12 = key === 'F12' || keyCode === 123;

      // Raccourcis d'inspection : Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      const isDevToolsCombo =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (key === 'I' ||
          key === 'i' ||
          key === 'J' ||
          key === 'j' ||
          key === 'C' ||
          key === 'c' ||
          keyCode === 73 ||
          keyCode === 74 ||
          keyCode === 67);

      // Afficher le code source : Ctrl+U
      const isViewSource =
        (e.ctrlKey || e.metaKey) &&
        (key === 'U' || key === 'u' || keyCode === 85);

      if (isF12 || isDevToolsCombo || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Attacher avec capture = true pour intercepter avant tout autre gestionnaire
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isBlocked]);

  return null;
}
