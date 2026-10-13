import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useDating } from '../context/DatingContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { userProfile } = useDating();
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/home", icon: "icon-home" },
    { name: "Subscription", path: "/subscription", icon: "icon-heart" },
    { name: "Wishlist", path: "/wishlist", icon: "icon-list" },
    { name: "Explore", path: "/explore", icon: "icon-wind" },
    { name: "Chat", path: "/chat-list", icon: "icon-grid" },
    { name: "Settings", path: "/setting", icon: "icon-settings" },
    { name: "Profile", path: "/profile", icon: "icon-user" },
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
            <div className="dz-media">
              <img src={userProfile?.avatar || "/assets/images/user/pic1.jpg"} alt="author-image" />
            </div>
            <div className="dz-info">
              <h5 className="name">{userProfile?.name || "John Doe"}</h5>
              <span>{userProfile?.email || "example@gmail.com"}</span>
            </div>
          </Link>

          <ul className="nav navbar-nav">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  onClick={onClose}
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
