import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RecentPics = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState({
    slot1: '/assets/images/slider/pic2.png',
    slot2: null,
    slot3: null,
    slot4: null,
    slot5: null,
  });

  const handleFileChange = (slot, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImages(prev => ({ ...prev, [slot]: url }));
    }
  };

  const handleRemove = (slot, e) => {
    e.stopPropagation();
    setImages(prev => ({ ...prev, [slot]: null }));
  };

  return (
    <div className="bg-white" style={{ minHeight: '100vh' }}>
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container">
            <div className="account-area">
              <Link to="/looking-for" className="back-btn dz-flex-box">
                <i className="icon feather icon-chevron-left"></i>
              </Link>
              <div className="section-head ps-0">
                <h3>Add your recent pics</h3>
              </div>

              <div className="row g-3">
                <div className="col-8">
                  <div className="dz-drop-box">
                    <div className="drop-bx bx-lg">
                      <div 
                        className="imagePreview" 
                        style={{ 
                          backgroundImage: `url(${images.slot1 || '/assets/images/recent-pic/drop-bx.png'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative'
                        }}
                      >
                        {images.slot1 && (
                          <div 
                            className="remove-img remove-btn" 
                            style={{ display: 'flex', cursor: 'pointer' }}
                            onClick={(e) => handleRemove('slot1', e)}
                          >
                            <i className="icon feather icon-x"></i>
                          </div>
                        )}
                        <input 
                          type="file" 
                          className="form-control d-none imageUpload" 
                          id="imageUpload1" 
                          accept=".png, .jpg, .jpeg"
                          onChange={(e) => handleFileChange('slot1', e)}
                        />
                        <label htmlFor="imageUpload1" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}></label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="dz-drop-box">
                        <div className="drop-bx">
                          <div 
                            className="imagePreview" 
                            style={{ 
                              backgroundImage: `url(${images.slot2 || '/assets/images/recent-pic/drop-bx.png'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              position: 'relative'
                            }}
                          >
                            {images.slot2 && (
                              <div 
                                className="remove-img remove-btn" 
                                style={{ display: 'flex', cursor: 'pointer' }}
                                onClick={(e) => handleRemove('slot2', e)}
                              >
                                <i className="icon feather icon-x"></i>
                              </div>
                            )}
                            <input 
                              type="file" 
                              className="form-control d-none imageUpload" 
                              id="imageUpload2" 
                              accept=".png, .jpg, .jpeg"
                              onChange={(e) => handleFileChange('slot2', e)}
                            />
                            <label htmlFor="imageUpload2" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}></label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="dz-drop-box">
                        <div className="drop-bx">
                          <div 
                            className="imagePreview" 
                            style={{ 
                              backgroundImage: `url(${images.slot3 || '/assets/images/recent-pic/drop-bx.png'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              position: 'relative'
                            }}
                          >
                            {images.slot3 && (
                              <div 
                                className="remove-img remove-btn" 
                                style={{ display: 'flex', cursor: 'pointer' }}
                                onClick={(e) => handleRemove('slot3', e)}
                              >
                                <i className="icon feather icon-x"></i>
                              </div>
                            )}
                            <input 
                              type="file" 
                              className="form-control d-none imageUpload" 
                              id="imageUpload3" 
                              accept=".png, .jpg, .jpeg"
                              onChange={(e) => handleFileChange('slot3', e)}
                            />
                            <label htmlFor="imageUpload3" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}></label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-4">
                  <div className="dz-drop-box">
                    <div className="drop-bx">
                      <div 
                        className="imagePreview" 
                        style={{ 
                          backgroundImage: `url(${images.slot4 || '/assets/images/recent-pic/drop-bx.png'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative'
                        }}
                      >
                        {images.slot4 && (
                          <div 
                            className="remove-img remove-btn" 
                            style={{ display: 'flex', cursor: 'pointer' }}
                            onClick={(e) => handleRemove('slot4', e)}
                          >
                            <i className="icon feather icon-x"></i>
                          </div>
                        )}
                        <input 
                          type="file" 
                          className="form-control d-none imageUpload" 
                          id="imageUpload4" 
                          accept=".png, .jpg, .jpeg"
                          onChange={(e) => handleFileChange('slot4', e)}
                        />
                        <label htmlFor="imageUpload4" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}></label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-4">
                  <div className="dz-drop-box">
                    <div className="drop-bx">
                      <div 
                        className="imagePreview" 
                        style={{ 
                          backgroundImage: `url(${images.slot5 || '/assets/images/recent-pic/drop-bx.png'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative'
                        }}
                      >
                        {images.slot5 && (
                          <div 
                            className="remove-img remove-btn" 
                            style={{ display: 'flex', cursor: 'pointer' }}
                            onClick={(e) => handleRemove('slot5', e)}
                          >
                            <i className="icon feather icon-x"></i>
                          </div>
                        )}
                        <input 
                          type="file" 
                          className="form-control d-none imageUpload" 
                          id="imageUpload5" 
                          accept=".png, .jpg, .jpeg"
                          onChange={(e) => handleFileChange('slot5', e)}
                        />
                        <label htmlFor="imageUpload5" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}></label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer fixed bg-white">
          <div className="container">
            <Link to="/" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentPics;
