import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDating } from '../context/DatingContext';

const BottomNav = ({ onSearchClick, isSearchOpen = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  let cartCount = 0;
  try {
    const datingCtx = useDating();
    const cartItems = datingCtx?.cartItems || [];
    cartCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  } catch (e) {
    try {
      const saved = localStorage.getItem('tiktok_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          cartCount = parsed.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
        }
      }
    } catch (err) {}
  }

  const tabs = [
    { path: '/', icon: 'flaticon flaticon-dog-house', label: 'Accueil' },
    { path: '/categories', icon: 'icon feather icon-book-open', label: 'Catégories' },
    { path: '/?search=true', icon: 'icon feather icon-search', isSearch: true, label: 'Recherche' },
    { path: '/panier', icon: 'icon feather icon-shopping-cart', label: 'Panier', isCart: true },
  ];

  return (
    <div className="menubar-area footer-fixed">
      <div className="toolbar-inner menubar-nav">
        {tabs.map((tab) => {
          const isHomeTab = tab.path === '/';
          const isSearchTab = Boolean(tab.isSearch);

          let isActive = false;
          if (isSearchTab) {
            isActive = isSearchOpen;
          } else if (isHomeTab) {
            isActive = (currentPath === '/' || currentPath === '/home') && !isSearchOpen;
          } else if (tab.path === '/categories') {
            isActive = currentPath.startsWith('/categories') || currentPath.startsWith('/wishlist');
          } else if (tab.path === '/panier') {
            isActive = currentPath === '/panier' || currentPath === '/cart' || currentPath === '/explore';
          } else {
            isActive = currentPath === tab.path || (tab.path === '/chat' && currentPath.startsWith('/chat'));
          }

          const handleClick = (e) => {
            if (tab.isSearch) {
              if (onSearchClick) {
                e.preventDefault();
                onSearchClick();
              } else {
                e.preventDefault();
                navigate('/?search=true');
              }
            }
          };

          return (
            <Link 
              key={tab.path} 
              to={tab.path} 
              onClick={handleClick}
              className={`nav-link ${isActive ? 'active' : ''}`}
              aria-label={tab.label}
            >
              <div className="nav-icon-wrapper" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={tab.icon}></i>
                {tab.isCart && cartCount > 0 && (
                  <span 
                    className="bottom-nav-cart-badge"
                    aria-label={`${cartCount} produit${cartCount > 1 ? 's' : ''} dans le panier`}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
