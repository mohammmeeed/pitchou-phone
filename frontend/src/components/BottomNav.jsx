import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/explore', icon: 'icon feather icon-shopping-cart' },
    { path: '/wishlist', icon: 'flaticon flaticon-heart' },
    { path: '/home', icon: 'flaticon flaticon-dog-house' },
    { path: '/chat-list', icon: 'flaticon flaticon-chat-1' },
    { path: '/profile', icon: 'flaticon flaticon-user' },
  ];

  return (
    <div className="menubar-area footer-fixed">
      <div className="toolbar-inner menubar-nav">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path || 
            (tab.path === '/chat-list' && currentPath.startsWith('/chat')) ||
            (tab.path === '/profile' && currentPath.startsWith('/profile'));

          return (
            <Link 
              key={tab.path} 
              to={tab.path} 
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <i className={tab.icon}></i>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
