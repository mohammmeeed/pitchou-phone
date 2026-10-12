import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Otp = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputs = useRef([]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/login" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Enter your code</h3>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); navigate('/first-name'); }}>
                <div id="otp" className="digit-group input-mini d-flex justify-content-between gap-2">
                  {digits.map((digit, idx) => (
                    <input 
                      key={idx}
                      ref={el => inputs.current[idx] = el}
                      className="form-control text-center" 
                      type="text" 
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                    />
                  ))}
                </div>                
              </form>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link to="/first-name" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Otp;
