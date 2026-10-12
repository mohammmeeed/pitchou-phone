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
            <div className="card-body">
              <div className="form-check mb-2">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="filterCheckMen"
                  checked={genderFilter.men}
                  onChange={(e) => setGenderFilter(prev => ({ ...prev, men: e.target.checked }))}
                />
                <label className="form-check-label ms-2" htmlFor="filterCheckMen">Men</label>
              </div>
              <div className="form-check mb-2">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="filterCheckWomen"
                  checked={genderFilter.women}
                  onChange={(e) => setGenderFilter(prev => ({ ...prev, women: e.target.checked }))}
                />
                <label className="form-check-label ms-2" htmlFor="filterCheckWomen">Women</label>
              </div>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="filterCheckNonbinary"
                  checked={genderFilter.nonbinary}
                  onChange={(e) => setGenderFilter(prev => ({ ...prev, nonbinary: e.target.checked }))}
                />
                <label className="form-check-label ms-2" htmlFor="filterCheckNonbinary">Nonbinary people</label>
              </div>	
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
