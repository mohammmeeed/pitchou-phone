import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/otp');
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/onboarding" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Please Enter your Phone Number</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group dz-select">
                  <div className="input-group-text p-0"> 
                    <select 
                      className="form-control border-0 bg-transparent ps-3 pe-2"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                  </div>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </form>		
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link to="/otp" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
