import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { userProfile, setUserProfile, cartItems = [] } = useDating() || {};
  const location = useLocation();

  const cartCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

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

  const isLoggedIn = !!(customerUser && (customerUser.name || customerUser.phone));
  const customerName = isLoggedIn ? customerUser.name : "Invité";
  const customerPhone = isLoggedIn ? (customerUser.phone || "") : "Cliquez pour vous connecter";

  const handleNavClick = (item) => {
    if (item.name === "Déconnexion") {
      try {
        localStorage.removeItem('customer_user');
        localStorage.removeItem('customer_token');
        if (setUserProfile) {
          setUserProfile(null);
        }
        setCustomerUser(null);
      } catch (e) {}
    }
    onClose();
  };

  const navItems = [
    { name: "Accueil", path: "/", icon: "icon-home" },
    { name: "Catégories", path: "/categories", icon: "icon-book-open" },
    { name: "Mon Panier", path: "/panier", icon: "icon-shopping-cart", isCart: true },
    { name: "Messagerie", path: "/chat", icon: "icon-message-circle" },
    { name: "Mon Profil", path: isLoggedIn ? "/profile" : "/login", icon: "icon-user" },
    ...(isLoggedIn
      ? [{ name: "Déconnexion", path: "/", icon: "icon-log-out" }]
      : [{ name: "Connexion / Inscription", path: "/login", icon: "icon-log-in" }])
  ];

  return (
    <>
      <div 
        className={`dark-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      ></div>

      <div className={`sidebar ${isOpen ? 'show' : ''}`}>
        <div className="inner-sidebar">
          <Link to={isLoggedIn ? "/profile" : "/login"} onClick={onClose} className="author-box">
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
              {isLoggedIn && customerUser?.avatar && !customerUser.avatar.includes('150x150') && !customerUser.avatar.includes('pic1.jpg') ? (
                <img src={customerUser.avatar} alt="author-image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : isLoggedIn ? (
                <span>{(customerName || 'C').charAt(0).toUpperCase()}</span>
              ) : (
                <i className="icon feather icon-user" style={{ fontSize: '20px' }}></i>
              )}
            </div>
            <div className="dz-info">
              <h5 className="name">{customerName}</h5>
              <span style={{ fontSize: '12px' }}>{customerPhone}</span>
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
                  <span className="dz-icon" style={{ position: 'relative' }}>
                    <i className={`icon feather ${item.icon}`}></i>
                    {item.isCart && cartCount > 0 && (
                      <span className="sidebar-cart-badge">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="sidebar-bottom">
            <div className="app-info">
              <h6 className="name">LeerBook</h6>
              <span className="ver-info">App Version 1.2</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
