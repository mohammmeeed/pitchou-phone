import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useDating } from '../context/DatingContext';

const Setting = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { userProfile } = useDating();
  const [distance, setDistance] = useState(25);
  const [ageRange, setAgeRange] = useState(28);

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
                <span>{userProfile?.phone || "+123 4567 890"}</span>
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
                <span>{userProfile?.email || "yourname@gmail.com"}</span>
              </div>
            </div>
          </div>

          <h6 className="title my-3">Discovery Setting</h6>

          <div className="card style-3 mb-2">
            <div className="card-header pb-1">
              <h6 className="title mb-0 font-14 font-w500">Location</h6>
            </div>
            <div className="card-body pt-1">
              <div className="setting-input d-flex align-items-center gap-2">
                <i className="icon dz-flex-box feather icon-map-pin text-primary"></i>
                <span>{userProfile?.location || "Montreal, Canada"}</span>
              </div>
            </div>
          </div>

          <div className="card style-3 mb-2">
            <div className="card-header pb-1">
              <h6 className="title mb-0 font-14 font-w500">Show Me</h6>
            </div>
            <div className="card-body pt-1">
              <div className="setting-input d-flex align-items-center justify-content-between">
                <span>{userProfile?.interestedIn || "Women"}</span>
                <i className="icon feather dz-flex-box icon-chevron-right text-muted"></i>
              </div>
            </div>
          </div>

          <h6 className="title my-3">Preferences</h6>

          <div className="card style-3 mb-2">
            <div className="card-header pb-1 d-flex justify-content-between align-items-center">
              <h6 className="title mb-0 font-14 font-w500">Maximum Distance</h6>
              <span className="text-primary font-w600">{distance} km</span>
            </div>
            <div className="card-body pt-2 pb-3">
              <input 
                type="range" 
                className="form-range w-100" 
                min="5" 
                max="100" 
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
          </div>

          <div className="card style-3 mb-3">
            <div className="card-header pb-1 d-flex justify-content-between align-items-center">
              <h6 className="title mb-0 font-14 font-w500">Age Range</h6>
              <span className="text-primary font-w600">18 - {ageRange}</span>
            </div>
            <div className="card-body pt-2 pb-3">
              <input 
                type="range" 
                className="form-range w-100" 
                min="18" 
                max="65" 
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
              />
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

          <Link to="/onboarding" className="btn btn-light w-100 rounded-xl text-danger">
            Logout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Setting;
