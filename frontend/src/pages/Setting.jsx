import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useDating } from '../context/DatingContext';

const Setting = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { userProfile } = useDating() || {};

  return (
    <div className="page-wrapper">
      <Header title="Settings" showBack={true} backUrl="/profile" bgWhite={true} />

      <div className="page-content space-top p-b60">
        <div className="container"> 
          <h6 className="title my-3">Account Setting</h6>
          
          <div className="card style-3 mb-2">
            <div className="card-header pb-1">
              <h6 className="title mb-0 font-14 font-w500">Phone Number</h6>
            </div>
            <div className="card-body pt-1">
              <div className="setting-input d-flex align-items-center gap-2">
                <i className="icon dz-flex-box feather icon-phone-call text-primary"></i>
                <span>{userProfile?.phone || "Non connecté"}</span>
              </div>
            </div>
          </div>

          <div className="card style-3 mb-3">
            <div className="card-header pb-1">
              <h6 className="title mb-0 font-14 font-w500">Email Address</h6>
            </div>
            <div className="card-body pt-1">
              <div className="setting-input d-flex align-items-center gap-2">
                <i className="icon dz-flex-box feather icon-mail text-primary"></i>
                <span>{userProfile?.email || "Non connecté"}</span>
              </div>
            </div>
          </div>



          <h6 className="title my-3">Display & Theme</h6>

          <div className="card style-3 mb-4">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="icon feather icon-moon font-18 text-primary"></i>
                <span className="font-14 font-w500">Dark Mode</span>
              </div>
              <div className="custom-switch">
                <input 
                  type="checkbox" 
                  className="switch-input theme-btn" 
                  id="toggle-dark-settings"
                  checked={darkMode}
                  onChange={toggleDarkMode}
                />
                <label className="custom-switch-label" htmlFor="toggle-dark-settings"></label>
              </div>
            </div>
          </div>

          <Link to="/home-setting" className="btn btn-outline-primary w-100 rounded-xl mb-3">
            Home & Theme Settings
          </Link>

          <Link to="/login" className="btn btn-light w-100 rounded-xl text-danger">
            Logout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Setting;
