// frontend/src/utils/favicon.js
// Gestion dynamique du Favicon basé sur le logo sélectionné dans le panneau d'administration

const DEFAULT_LOGO = '/uploads/prod_img_1793699618_5e18935c.png';

export function applyFavicon(logoUrl) {
  const url = (logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '')
    ? logoUrl.trim()
    : DEFAULT_LOGO;

  const iconLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
  if (iconLinks.length > 0) {
    iconLinks.forEach((link) => {
      link.href = url;
      // Pour forcer le rechargement immédiat par le navigateur
      if (link.type) {
        link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      }
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = url;
    document.head.appendChild(link);
  }
}

export function initFaviconManager() {
  // 1. Appliquer immédiatement le logo sauvegardé dans localStorage
  try {
    const saved = localStorage.getItem('shop_logo_image');
    if (saved) {
      applyFavicon(saved);
    }
  } catch (e) {}

  // 2. Synchroniser avec les paramètres de la base de données
  fetch('/api/parameters')
    .then((res) => res.json())
    .then((data) => {
      const logo = data?.settings?.logo_image;
      if (logo && typeof logo === 'string' && logo.trim() !== '') {
        try {
          localStorage.setItem('shop_logo_image', logo);
        } catch (e) {}
        applyFavicon(logo);
      }
    })
    .catch(() => {});

  // 3. Écouteur en temps réel lorsque l'admin change ou supprime le logo
  const handleLogoChanged = (e) => {
    const newLogo = e?.detail?.logo;
    applyFavicon(newLogo);
  };

  window.addEventListener('shop_logo_changed', handleLogoChanged);
  return () => {
    window.removeEventListener('shop_logo_changed', handleLogoChanged);
  };
}

