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
              <Link to="/home">
                <img src="/assets/images/logo.png" alt="logo" />
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
