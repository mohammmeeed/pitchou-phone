import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';

const HomeSetting = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="page-wrapper">
      <Header title="Theme Settings" showBack={true} backUrl="/" bgWhite={true} />

      <div className="page-content overflow-hidden space-top p-b60">
        <div className="container">
          <div className="main-banner mb-3 position-relative text-center py-4">
            <div className="banner-content-2">
              <img className="dz-logo mx-auto mb-2" src="/assets/images/logo.png" alt="logo" style={{ maxHeight: '45px' }} />
              <h2 className="title">Explore Pitchou</h2>
              <p className="text-muted">Votre librairie en ligne préférée</p>
            </div>
            <div className="bg-shape">
              <img className="shape-light" src="/assets/images/welcome/bubble.png" alt="" />
              <img className="shape-dark" src="/assets/images/welcome/bubble-dark.png" alt="" />
            </div>
          </div>

          <div className="dz-list-group m-b30">
            <ul className="list-unstyled">
              <li className="mb-2">
                <a role="button" tabIndex={0} onClick={toggleDarkMode} className="theme-change d-flex align-items-center p-3 bg-white rounded-xl shadow-sm text-decoration-none" style={{ cursor: 'pointer' }}>
                  <div className="dz-icon theme-btn bg-pink light me-3 p-2 rounded-circle">
                    <i className="icon feather icon-moon font-20 text-primary"></i>
                  </div>
                  <div className="dz-inner-content flex-grow-1">
                    <span className="title font-w600 text-dark">Dark Mode</span>
                    <p className="para-text text-muted mb-0 font-12">{darkMode ? 'Activated' : 'Just For You'}</p>
                  </div>
                  <div className="custom-switch">
                    <input 
                      type="checkbox" 
                      className="switch-input" 
                      id="home-setting-dark" 
                      checked={darkMode}
                      readOnly
                    />
                    <label className="custom-switch-label" htmlFor="home-setting-dark"></label>
                  </div>
                </a>
              </li>

              <li className="mb-2">
                <a role="button" tabIndex={0} className="d-flex align-items-center p-3 bg-white rounded-xl shadow-sm text-decoration-none" style={{ cursor: 'pointer' }}>
                  <div className="dz-icon bg-blue light menu-share me-3 p-2 rounded-circle">
                    <i className="icon feather icon-share-2 font-20 text-info"></i>
                  </div>
                  <div className="dz-inner-content flex-grow-1">
                    <span className="title font-w600 text-dark">App Share</span>
                    <p className="para-text text-muted mb-0 font-12">Share with friends</p>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </a>
              </li>

              <li>
                <a role="button" tabIndex={0} className="d-flex align-items-center p-3 bg-white rounded-xl shadow-sm text-decoration-none" style={{ cursor: 'pointer' }}>
                  <div className="dz-icon bg-red light me-3 p-2 rounded-circle">
                    <i className="icon feather icon-globe font-20 text-danger"></i>
                  </div>
                  <div className="dz-inner-content flex-grow-1">
                    <span className="title font-w600 text-dark">Language</span>
                    <p className="para-text text-muted mb-0 font-12 select-lang">English</p>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </a>
              </li>
            </ul>
          </div>

          <div className="contact-area text-center mt-4">
            <img className="dz-logo mx-auto mb-2" src="/assets/images/logo.png" alt="logo" style={{ maxHeight: '35px' }} />
            <div className="support-box my-2">
              <p className="text-muted font-12">Built to match modern dating app design trends with complete mobile interactivity.</p>
            </div>
            <ul className="social-icon list-unstyled d-flex justify-content-center gap-3">
              <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-primary font-18"><i className="fa-brands fa-facebook-f"></i></a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-info font-18"><i className="fa-brands fa-twitter"></i></a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-danger font-18"><i className="fa-brands fa-instagram"></i></a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSetting;
