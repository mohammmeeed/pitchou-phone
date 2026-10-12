import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDating } from '../context/DatingContext';

const EditProfile = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useDating();

  const [formData, setFormData] = useState({
    name: userProfile?.name || "Richard",
    age: userProfile?.age || 20,
    location: userProfile?.location || "Mentreal, Canada",
    bio: "Passionate about photography, indie music, and travelling across new cities.",
    job: "Photographer & Designer",
    company: "Freelance Studio",
    school: "University of Arts",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      name: formData.name,
      age: formData.age,
      location: formData.location
    }));
    navigate('/profile');
  };

  return (
    <div className="page-wrapper">
      <Header title="Edit Profile" showBack={true} backUrl="/profile" bgWhite={true} />

      <div className="page-content space-top p-b60">
        <div className="container">
          <form onSubmit={handleSubmit}>
            {/* Photos Upload Grid */}
            <div className="row g-3 mb-3">
              <div className="col-8">
                <div className="dz-drop-box style-2">
                  <div className="drop-bx bx-lg">
                    <div 
                      className="imagePreview" 
                      style={{ 
                        backgroundImage: `url(${userProfile?.avatar || '/assets/images/user/pic1.jpg'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-4">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="dz-drop-box style-2">
                      <div className="drop-bx">
                        <div 
                          className="imagePreview" 
                          style={{ 
                            backgroundImage: 'url(/assets/images/slider/pic2.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="dz-drop-box style-2">
                      <div className="drop-bx">
                        <div 
                          className="imagePreview" 
                          style={{ 
                            backgroundImage: 'url(/assets/images/slider/pic3.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile fields */}
            <div className="mb-3">
              <label className="form-label font-w600 font-14">Display Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label font-w600 font-14">About Me</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              ></textarea>
            </div>

            <div className="mb-3">
              <label className="form-label font-w600 font-14">Job Title</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.job}
                onChange={(e) => setFormData({ ...formData, job: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label font-w600 font-14">Company</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="form-label font-w600 font-14">Living in</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-lg btn-gradient w-100 dz-flex-box rounded-xl">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
