import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ 
  title, 
  showBack = false, 
  backUrl, 
  showMenu = false, 
  onMenuClick, 
  showFilter = false, 
  filterUrl = "/filter",
  bgWhite = false,
  borderZero = false,
  rightCustom
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const [shopLogo, setShopLogo] = React.useState(() => {
    return localStorage.getItem('shop_logo_image') || '';
  });
  const [shopLogoText, setShopLogoText] = React.useState(() => {
    return localStorage.getItem('shop_logo_text') || 'TikTok Shop';
  });

  React.useEffect(() => {
    const handleLogoChange = (e) => {
      if (e?.detail?.logo !== undefined) setShopLogo(e.detail.logo);
      if (e?.detail?.text !== undefined) setShopLogoText(e.detail.text);
    };
    window.addEventListener('shop_logo_changed', handleLogoChange);

    fetch('http://localhost:8000/api/parameters')
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
              >
                <i className="icon feather icon-grid"></i>
              </a>
            )}
            {title && <h6 className="title mb-0">{title}</h6>}
          </div>
          
          <div className="mid-content header-logo">
            {!title && (
              <Link to="/home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            ) : showFilter ? (
              <Link to={filterUrl} className="filter-icon">
                <i className="flaticon flaticon-settings-sliders"></i>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
