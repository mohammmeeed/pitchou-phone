import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ 
  title, 
  showBack = false, 
  backUrl, 
  onBackClick,
  showMenu = false, 
  onMenuClick, 
  showFilter = false, 
  filterUrl = "/filter",
  onSearchClick,
  searchActive = false,
  bgWhite = false,
  borderZero = false,
  rightCustom,
  viewMode = 'feed',
  onViewModeChange
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof onBackClick === 'function') {
      onBackClick();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const [shopLogo, setShopLogo] = React.useState(() => {
    return localStorage.getItem('shop_logo_image') || '';
  });
  const [shopLogoText, setShopLogoText] = React.useState(() => {
    return localStorage.getItem('shop_logo_text') || 'LeerBook';
  });

  React.useEffect(() => {
    const handleLogoChange = (e) => {
      if (e?.detail?.logo !== undefined) setShopLogo(e.detail.logo);
      if (e?.detail?.text !== undefined) setShopLogoText(e.detail.text);
    };
    window.addEventListener('shop_logo_changed', handleLogoChange);

    fetch('/api/parameters')
      .then(res => res.json())
      .then(data => {
        if (data?.settings?.logo_image !== undefined) {
          setShopLogo(data.settings.logo_image);
          localStorage.setItem('shop_logo_image', data.settings.logo_image || '');
        }
        if (data?.settings?.logo_text) {
          setShopLogoText(data.settings.logo_text);
          localStorage.setItem('shop_logo_text', data.settings.logo_text);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('shop_logo_changed', handleLogoChange);
  }, []);

  return (
    <header className={`header header-fixed ${bgWhite ? 'bg-white' : ''} ${borderZero ? 'border-0' : ''}`}>
      <div className="container">
        <div className="header-content">
          <div className="left-content">
            {showBack && (
              <a 
                role="button" 
                tabIndex={0}
                onClick={handleBack} 
                className="back-btn me-2"
                style={{ cursor: 'pointer' }}
              >
                <i className="icon feather icon-chevron-left"></i>
              </a>
            )}
            {showMenu && (
              <a 
                role="button" 
                tabIndex={0}
                onClick={onMenuClick} 
                className="menu-toggler"
                style={{ cursor: 'pointer' }}
                aria-label="Menu"
              >
                <i className="icon feather icon-menu"></i>
              </a>
            )}
            {title && <h6 className="title mb-0">{title}</h6>}
          </div>
          
          <div className="mid-content header-logo">
            {!title && (
              <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {shopLogo ? (
                  <img src={shopLogo} alt={shopLogoText || "Logo"} style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} />
                ) : (
                  <img src="/assets/images/logo.png" alt="logo" style={{ maxHeight: '36px', objectFit: 'contain' }} />
                )}
              </Link>
            )}
          </div>

          <div className="right-content dz-meta">
            {rightCustom ? (
              rightCustom
            ) : onViewModeChange ? (
              <button
                type="button"
                onClick={() => onViewModeChange(viewMode === 'feed' ? 'grid' : 'feed')}
                className="filter-icon"
                style={{
                  background: 'transparent',
                  color: 'inherit',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title={viewMode === 'feed' ? "Afficher en grille 2x2" : "Afficher en plein écran"}
                aria-label="Changer le mode d'affichage"
              >
                {viewMode === 'feed' ? (
                  /* 4 Carrés : pour passer en grille 2x2 */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                  </svg>
                ) : (
                  /* Téléphone : pour revenir au mode scroll/plein écran */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                )}
              </button>
            ) : showFilter ? (
              onSearchClick ? (
                <button
                  type="button"
                  onClick={onSearchClick}
                  className={`filter-icon ${searchActive ? 'active' : ''}`}
                  style={{
                    background: searchActive ? 'var(--primary)' : 'transparent',
                    color: searchActive ? '#ffffff' : 'inherit',
                    borderColor: searchActive ? 'var(--primary)' : 'var(--border-color)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title={searchActive ? "Fermer la recherche" : "Rechercher"}
                  aria-label="Recherche"
                >
                  <i className={`icon feather ${searchActive ? 'icon-x' : 'icon-search'}`}></i>
                </button>
              ) : (
                <Link to={filterUrl} className="filter-icon">
                  <i className="icon feather icon-search"></i>
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
