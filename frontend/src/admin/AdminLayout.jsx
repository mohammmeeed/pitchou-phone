// frontend/src/admin/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from './services/adminApi';
import './admin.css';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(adminApi.getCurrentAdmin());
  const location = useLocation();
  const navigate = useNavigate();

  const [shopLogo, setShopLogo] = useState(() => localStorage.getItem('shop_logo_image') || '');
  const [shopLogoText, setShopLogoText] = useState(() => localStorage.getItem('shop_logo_text') || 'LeerBook');

  // Vérifier la session administrateur et charger le logo du site
  useEffect(() => {
    // Si non connecté, redirection immédiate vers la page de connexion admin
    if (!adminApi.isAuthenticated()) {
      navigate('/admin/login', { replace: true });
      return;
    }

    // Charger les infos administrateur depuis l'API backend
    adminApi.getAdminProfile().then((data) => {
      if (data) setCurrentAdmin(data);
    });

    // Écouter les modifications du logo depuis Paramètres du Site
    const handleLogoChange = (e) => {
      if (e?.detail?.logo !== undefined) setShopLogo(e.detail.logo);
      if (e?.detail?.text !== undefined) setShopLogoText(e.detail.text);
    };
    window.addEventListener('shop_logo_changed', handleLogoChange);

    // Charger les paramètres du site (logo et nom de la boutique)
    fetch('/api/parameters')
      .then((res) => res.json())
      .then((data) => {
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
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.setItem('admin_explicit_logout', 'true');
    adminApi.logout();
    navigate('/admin/login');
  };

  const navLinks = [
    {
      category: 'Analytique & Ventes',
      items: [
        {
          title: 'Tableau de Bord',
          to: '/admin',
          icon: 'flaticon-381-networking'
        }
      ]
    },
    {
      category: 'Catalogue & Stock',
      items: [
        {
          title: 'Gestion des Produits',
          to: '/admin/products',
          icon: 'flaticon-381-box'
        }
      ]
    },
    {
      category: 'Gestion Commerciale',
      items: [
        {
          title: 'Commandes',
          to: '/admin/orders',
          icon: 'flaticon-381-file'
        },
        {
          title: 'Clients & Acheteurs',
          to: '/admin/customers',
          icon: 'flaticon-381-user-7'
        },
        {
          title: 'Messagerie Clients',
          to: '/admin/chat',
          icon: 'flaticon-381-send-2'
        }
      ]
    },
    {
      category: 'Configuration & Profil',
      items: [
        {
          title: 'Mon Compte Admin',
          to: '/admin/account',
          icon: 'flaticon-381-user-7'
        },
        {
          // Safe Route per design.md: never /admin/settings, always /admin/parameter
          title: 'Paramètres du Site',
          to: '/admin/parameter',
          icon: 'flaticon-381-settings-2'
        }
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Ne rien afficher si non connecté (la redirection est déclenchée par useEffect ou ProtectedRoute)
  if (!adminApi.isAuthenticated()) {
    return null;
  }

  return (
    <div className="mediqu-admin">
      <div className="admin-shell">
        {/* Left Sidebar Navigation */}
        <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <Link to="/admin" className="sidebar-brand">
              <div
                className="brand-icon"
                style={{
                  background: shopLogo ? '#ffffff' : 'linear-gradient(135deg, #111111 0%, #2b2b2b 100%)',
                  padding: shopLogo ? '4px' : '0',
                  border: shopLogo ? '1px solid #ebebeb' : 'none',
                  overflow: 'hidden'
                }}
              >
                {shopLogo ? (
                  <img
                    src={shopLogo}
                    alt={shopLogoText || 'Logo'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '6px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <i className="flaticon-381-heart" />
                )}
              </div>
              {!isCollapsed && (
                <div className="brand-text">
                  <h2 style={{ textTransform: 'capitalize' }}>{shopLogoText || 'LeerBook'}</h2>
                  <span>Admin E-Commerce</span>
                </div>
              )}
            </Link>
          </div>

          <ul className="sidebar-menu">
            {navLinks.map((cat, idx) => (
              <React.Fragment key={idx}>
                {!isCollapsed && <span className="menu-category">{cat.category}</span>}
                {cat.items.map((item, itemIdx) => {
                  const active = isActive(item.to);
                  return (
                    <li key={itemIdx} className="menu-item">
                      <Link
                        to={item.to}
                        className={`menu-link ${active ? 'active' : ''}`}
                        title={item.title}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <i className={item.icon} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </Link>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
          </ul>

          {/* Sidebar Footer : Élimination totale de l'avatar photo & Gestion du compte */}
          <div className="sidebar-footer" style={{ padding: '0.85rem' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e4e4e7',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              {!isCollapsed ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#111111',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {currentAdmin?.name || 'Administrateur'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#71717a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {currentAdmin?.email || 'admin@tiktokshop.dz'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #f4f4f5', paddingTop: '0.6rem' }}>
                    <Link
                      to="/admin/account"
                      className="btn-light-custom"
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        justifyContent: 'center',
                        textDecoration: 'none'
                      }}
                      title="Gérer mon compte"
                    >
                      <i className="flaticon-381-user-7" style={{ fontSize: '0.75rem' }} /> Mon Compte
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn-light-custom"
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.75rem',
                        color: '#e11d48',
                        borderColor: '#fecdd3',
                        backgroundColor: '#fff1f2',
                        cursor: 'pointer'
                      }}
                      title="Se déconnecter"
                    >
                      <i className="flaticon-381-exit" style={{ fontSize: '0.75rem' }} />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-light-custom"
                  style={{
                    padding: '0.5rem',
                    color: '#e11d48',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                  title="Déconnexion"
                >
                  <i className="flaticon-381-exit" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Body */}
        <div className={`admin-main ${isCollapsed ? 'collapsed' : ''}`}>
          {/* Top Sticky Header */}
          <header className="admin-topbar">
            <div className="topbar-left">
              <button
                className="nav-toggle-btn"
                onClick={() => {
                  if (window.innerWidth < 992) {
                    setIsMobileOpen(!isMobileOpen);
                  } else {
                    setIsCollapsed(!isCollapsed);
                  }
                }}
                title="Basculer le menu"
              >
                <i className="flaticon-381-menu-2" />
              </button>

              <div className="topbar-search">
                <i className="flaticon-381-search-2" />
                <input
                  type="text"
                  placeholder="Rechercher commandes, produits, clients..."
                />
              </div>
            </div>

            <div className="topbar-right">
              <Link to="/home" className="live-shop-btn" title="Voir la boutique client">
                <i className="feather icon-shopping-bag" />
                <span>Boutique en Direct</span>
              </Link>

              {/* Bouton Déconnexion Topbar */}
              <button
                type="button"
                onClick={handleLogout}
                className="btn-light-custom"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  color: '#e11d48',
                  borderColor: '#fecdd3',
                  backgroundColor: '#fff1f2',
                  cursor: 'pointer'
                }}
                title="Se déconnecter"
              >
                <i className="flaticon-381-exit" />
                <span>Déconnexion</span>
              </button>
            </div>
          </header> 

          {/* Children Page View */}
          <main className="admin-content-body">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
