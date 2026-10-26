// frontend/src/admin/AdminLayout.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [shopLogoText, setShopLogoText] = useState(() => localStorage.getItem('shop_logo_text') || '');

  // Recherche des sections d'administration
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef(null);

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
          title: 'Journal de Caisse',
          to: '/admin/cashflow',
          icon: 'flaticon-381-notepad-1'
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

  // Gestion de la fermeture du dropdown lors d'un clic extérieur ou changement de page
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchTerm('');
  }, [location.pathname]);

  // Liste exhaustive des sections d'administration avec métadonnées et mots-clés
  const adminSections = useMemo(() => [
    {
      title: 'Tableau de Bord',
      to: '/admin',
      icon: 'flaticon-381-networking',
      category: 'Analytique & Ventes',
      keywords: 'statistiques ventes analytique accueil dashboard kpi',
      color: '#3b82f6'
    },
    {
      title: 'Gestion des Produits',
      to: '/admin/products',
      icon: 'flaticon-381-box',
      category: 'Catalogue & Stock',
      keywords: 'produits livres catalogue stock prix articles inventaire',
      color: '#fe2c55'
    },
    {
      title: 'Paramètres des Attributs & Wilayas',
      to: '/admin/products?view=attributes',
      icon: 'fas fa-tags',
      category: 'Catalogue & Stock',
      keywords: 'attributs catégories langues wilayas frais livraison tarifs',
      color: '#fe2c55'
    },
    {
      title: 'Commandes',
      to: '/admin/orders',
      icon: 'flaticon-381-file',
      category: 'Gestion Commerciale',
      keywords: 'commandes orders livraisons facturation expéditions vente bon',
      color: '#10b981'
    },
    {
      title: 'Journal de Caisse',
      to: '/admin/cashflow',
      icon: 'flaticon-381-notepad-1',
      category: 'Gestion Commerciale',
      keywords: 'caisse journal cashflow recettes dépenses bénéfice trésorerie finance argent sorties entrées',
      color: '#8b5cf6'
    },
    {
      title: 'Clients & Acheteurs',
      to: '/admin/customers',
      icon: 'flaticon-381-user-7',
      category: 'Gestion Commerciale',
      keywords: 'clients acheteurs utilisateurs adresses téléphone comptes acheteur',
      color: '#f59e0b'
    },
    {
      title: 'Messagerie Clients',
      to: '/admin/chat',
      icon: 'flaticon-381-send-2',
      category: 'Gestion Commerciale',
      keywords: 'messagerie messages chat discussions conversations support contact',
      color: '#06b6d4'
    },
    {
      title: 'Paramètres du Site',
      to: '/admin/parameter',
      icon: 'flaticon-381-settings-2',
      category: 'Configuration & Profil',
      keywords: 'paramètres configuration boutique smtp devise design logo informations',
      color: '#64748b'
    },
    {
      title: 'Mon Compte Admin',
      to: '/admin/account',
      icon: 'flaticon-381-user-7',
      category: 'Configuration & Profil',
      keywords: 'compte profil admin mot de passe administrateurs sécurité utilisateurs',
      color: '#111827'
    }
  ], []);

  // Filtrage intelligent selon la recherche
  const filteredSections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return adminSections;
    return adminSections.filter((sec) =>
      sec.title.toLowerCase().includes(q) ||
      sec.category.toLowerCase().includes(q) ||
      sec.keywords.toLowerCase().includes(q)
    );
  }, [adminSections, searchTerm]);

  const handleSelectSection = (sec) => {
    setIsSearchOpen(false);
    setSearchTerm('');
    navigate(sec.to);
  };

  const handleSearchKeyDown = (e) => {
    if (!isSearchOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsSearchOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredSections.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredSections.length) % (filteredSections.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSections[selectedIndex]) {
        handleSelectSection(filteredSections[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
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
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Link
                    to="/admin/account"
                    className="btn-light-custom"
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.6rem',
                      fontSize: '0.8rem',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                    title="Gérer mon compte"
                  >
                    <i className="flaticon-381-user-7" style={{ fontSize: '0.78rem' }} /> Mon Compte
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-light-custom"
                    style={{
                      padding: '0.45rem 0.7rem',
                      fontSize: '0.8rem',
                      color: '#e11d48',
                      borderColor: '#fecdd3',
                      backgroundColor: '#fff1f2',
                      cursor: 'pointer'
                    }}
                    title="Se déconnecter"
                  >
                    <i className="flaticon-381-exit" style={{ fontSize: '0.78rem' }} />
                  </button>
                </div>
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

              <div className="topbar-search" ref={searchRef}>
                <i className="flaticon-381-search-2 search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher une section admin..."
                  value={searchTerm || ''}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                    setSelectedIndex(0);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedIndex(0);
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: '2px 5px'
                    }}
                    title="Effacer"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}

                {/* Dropdown des sections d'administration */}
                {isSearchOpen && (
                  <div className="topbar-search-dropdown">
                    <div className="search-dropdown-header">
                      <span>
                        <i className="fas fa-compass" style={{ marginRight: '0.4rem', color: '#fe2c55' }} />
                        {searchTerm ? 'Résultats de recherche' : 'Sections Administrateur'}
                      </span>
                      <span className="search-count-badge">
                        {filteredSections.length} {filteredSections.length > 1 ? 'sections' : 'section'}
                      </span>
                    </div>

                    <div className="search-dropdown-list">
                      {filteredSections.length > 0 ? (
                        filteredSections.map((sec, idx) => {
                          const isSelected = idx === selectedIndex;
                          return (
                            <div
                              key={sec.to + sec.title}
                              className={`search-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              onClick={() => handleSelectSection(sec)}
                            >
                              <div
                                className="search-item-icon"
                                style={{
                                  backgroundColor: `${sec.color}15`,
                                  color: sec.color
                                }}
                              >
                                <i className={sec.icon} />
                              </div>
                              <div className="search-item-content">
                                <div className="search-item-title">{sec.title}</div>
                                <div className="search-item-meta">{sec.category}</div>
                              </div>
                              <div className="search-item-arrow">
                                <i className="fas fa-arrow-right" />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="search-empty-state">
                          <i className="fas fa-search" style={{ fontSize: '1.4rem', color: '#94a3b8', marginBottom: '0.4rem' }} />
                          <p style={{ margin: 0, fontWeight: 600, color: '#64748b', fontSize: '0.88rem' }}>
                            Aucune section ne correspond à "{searchTerm}"
                          </p>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            Essayez : Produits, Caisse, Commandes, Clients, Paramètres...
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="search-dropdown-footer">
                      <span><kbd>↑</kbd> <kbd>↓</kbd> Naviguer</span>
                      <span><kbd>↵ Entrée</kbd> Ouvrir</span>
                      <span><kbd>Échap</kbd> Fermer</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="topbar-right">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="live-shop-btn"
                title="Voir la boutique client (ouvrir dans un nouvel onglet)"
              >
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
