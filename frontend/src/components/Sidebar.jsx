import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useDating } from '../context/DatingContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { userProfile, setUserProfile } = useDating();
  const location = useLocation();

  // Récupérer le nom de compte et le numéro de téléphone du client
  const [customerUser, setCustomerUser] = React.useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  React.useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('customer_user');
        if (saved) setCustomerUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, [isOpen]);

  const customerName = customerUser?.name || userProfile?.name || "mouh";
  const customerPhone = customerUser?.phone || userProfile?.phone || "0697037109";

  const handleNavClick = (item) => {
    if (item.name === "Déconnexion") {
      try {
        localStorage.removeItem('customer_user');
        localStorage.removeItem('customer_token');
        if (setUserProfile) {
          setUserProfile({
            name: "Client",
            email: "",
            phone: "",
            gender: "Men",
            interestedIn: "Livres",
            lookingFor: "Lectures passionnantes",
            avatar: null,
            age: 24,
            location: "Alger",
          });
        }
        setCustomerUser(null);
      } catch (e) {}
    }
    onClose();
  };

  const navItems = [
    { name: "Accueil", path: "/home", icon: "icon-home" },
    { name: "Favoris", path: "/wishlist", icon: "icon-list" },
    { name: "Mon Panier", path: "/explore", icon: "icon-shopping-cart" },
    { name: "Messagerie", path: "/chat", icon: "icon-message-circle" },
    { name: "Paramètres", path: "/setting", icon: "icon-settings" },
    { name: "Mon Profil", path: "/profile", icon: "icon-user" },
    { name: "Panneau Admin", path: "/admin", icon: "icon-shield" },
    { name: "Connexion / Inscription", path: "/auth", icon: "icon-log-in" },
    { name: "Déconnexion", path: "/auth", icon: "icon-log-out" },
  ];

  return (
    <>
      <div 
        className={`dark-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      ></div>

      <div className={`sidebar ${isOpen ? 'show' : ''}`}>
        <div className="inner-sidebar">
          <Link to="/profile" onClick={onClose} className="author-box">
            <div 
              className="dz-media" 
              style={{ 
                width: '45px', 
                height: '45px', 
                borderRadius: '50%', 
                background: 'var(--btn-gradient, var(--primary-gradient))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px',
                flexShrink: 0,
                boxShadow: 'var(--btn-shadow, 0 4px 12px var(--rgba-primary-3))'
              }}
            >
              {customerUser?.avatar && !customerUser.avatar.includes('150x150') && !customerUser.avatar.includes('pic1.jpg') ? (
                <img src={customerUser.avatar} alt="author-image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span>{(customerName || 'C').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="dz-info">
              <h5 className="name">{customerName}</h5>
              <span>{customerPhone}</span>
            </div>
          </Link>

          <ul className="nav navbar-nav">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  onClick={() => handleNavClick(item)}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="dz-icon">
                    <i className={`icon feather ${item.icon}`}></i>
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="sidebar-bottom">
            <ul className="app-setting">
              <li>
                <div className="mode">
                  <span className="dz-icon">
                    <i className="icon feather icon-moon"></i>
                  </span>
                  <span>Dark Mode</span>
                  <div className="custom-switch">
                    <input 
                      type="checkbox" 
                      className="switch-input theme-btn" 
                      id="toggle-dark-menu"
                      checked={darkMode}
                      onChange={toggleDarkMode}
                    />
                    <label className="custom-switch-label" htmlFor="toggle-dark-menu"></label>
                  </div>
                </div>
              </li>
            </ul>
            <div className="app-info">
              <h6 className="name">Dating Kit</h6>
              <span className="ver-info">App Version 1.2</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
