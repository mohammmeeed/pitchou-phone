import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Filter = () => {
  const navigate = useNavigate();
  const [genderFilter, setGenderFilter] = useState({
    men: false,
    women: true,
    nonbinary: false,
  });
  const [ageRange, setAgeRange] = useState(25);
  const [distance, setDistance] = useState(15);

  const handleApply = () => {
    navigate('/home');
  };

  return (
    <div className="page-wrapper">
      <Header title="Date Filter" showBack={true} backUrl="/home" />

      <div className="page-content space-top p-b50">
        <div className="container">
          <div className="card style-1">
            <div className="card-header">
              <h6 className="title font-w400 font-14 mb-0">Who you want to date</h6>
            </div>
            <div className="card-body p-0">
              {[
                { id: 'men', label: 'Men' },
                { id: 'women', label: 'Women' },
                { id: 'nonbinary', label: 'Nonbinary people' },
              ].map((item, idx, arr) => {
                const isChecked = genderFilter[item.id];
                const isLast = idx === arr.length - 1;
                return (
                  <div
                    key={item.id}
                    onClick={() => setGenderFilter(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="d-flex align-items-center justify-content-between px-3 py-3"
                    style={{
                      cursor: 'pointer',
                      borderBottom: isLast ? 'none' : '1px solid #f1f3f6',
                      transition: 'background 0.2s ease',
                      backgroundColor: isChecked ? 'rgba(254, 44, 85, 0.03)' : 'transparent',
                    }}
                  >
                    <span 
                      style={{
                        fontSize: '15px',
                        fontWeight: isChecked ? 600 : 400,
                        color: isChecked ? '#111827' : '#4b5563',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {item.label}
                    </span>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: isChecked ? '2px solid #fe2c55' : '2px solid #d1d5db',
                        background: isChecked ? 'linear-gradient(135deg, #f33e5b 0%, #fe2c55 100%)' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isChecked ? '0 3px 8px rgba(254, 44, 85, 0.35)' : 'none',
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card style-1">
            <div className="card-header">
              <h6 className="title font-w400 font-14 mb-0">Age</h6>
            </div>
            <div className="card-body">
              <div className="range-slider style-1">
                <div className="mb-3 title font-w600 font-16 d-flex justify-content-between">
                  <span>18</span>
                  <span className="text-primary font-w700">{ageRange} years</span>
                  <span>50+</span>
                </div>
                <input 
                  type="range" 
                  className="form-range w-100" 
                  min="18" 
                  max="60" 
                  value={ageRange} 
                  onChange={(e) => setAgeRange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card style-1">
            <div className="card-header">
              <h6 className="title font-w400 font-14 mb-0">Distance</h6>
            </div>
            <div className="card-body">
              <div className="range-slider style-1">
                <div className="mb-3 title font-w600 font-16 d-flex justify-content-between">
                  <span>1 km</span>
                  <span className="text-primary font-w700">{distance} km</span>
                  <span>100 km</span>
                </div>
                <input 
                  type="range" 
                  className="form-range w-100" 
                  min="1" 
                  max="100" 
                  value={distance} 
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer fixed">
        <div className="container">
          <button 
            type="button" 
            onClick={handleApply}
            className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filter;
