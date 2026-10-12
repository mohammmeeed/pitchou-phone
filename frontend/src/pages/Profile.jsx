import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const Profile = () => {
  const { userProfile } = useDating();

  return (
    <div className="page-wrapper">
      <Header 
        title="Profile" 
        showBack={true} 
        backUrl="/home"
        showFilter={true}
        filterUrl="/filter"
        bgWhite={true}
        borderZero={true}
      />

      <div className="page-content space-top p-b60">
        <div className="container pt-0"> 
          <div className="profile-area">
            <div className="main-profile">
              <div className="about-profile">
                <Link to="/setting" className="setting dz-icon">
                  <i className="flaticon flaticon-setting"></i>
                </Link>

                <div className="media rounded-circle">
                  <img src={userProfile?.avatar || "/assets/images/user/pic1.jpg"} alt="profile-image" />
                  <svg className="radial-progress m-b20" data-percentage="40" viewBox="0 0 80 80">
                    <circle className="incomplete" cx="40" cy="40" r="35"></circle>
                    <circle className="complete" cx="40" cy="40" r="35" style={{ strokeDashoffset: '39.58406743523136' }}></circle>
                  </svg>
                  <div className="data-fill"><span>40%</span></div>
                </div>

                <Link to="/edit-profile" className="edit-profile dz-icon">
                  <i className="flaticon flaticon-pencil-2"></i>
                </Link>
              </div>

              <div className="profile-detail text-center mt-2">
                <h5 className="name">{userProfile?.name || "Richard"}, {userProfile?.age || 22}</h5>
                <p className="mb-0 text-muted">
                  <i className="icon feather icon-map-pin me-1"></i> {userProfile?.location || "Mentreal, Canada"}
                </p>
              </div>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-4">
                <div className="card style-2 text-center">
                  <div className="card-body p-2">
                    <Link to="/subscription">	
                      <div className="card-icon mb-1">
                        <i className="flaticon flaticon-star-1 font-24 text-primary"></i>
                      </div>
                      <div className="card-content">
                        <p className="font-12 mb-1">0 Super Likes</p>
                      </div>
                      <i className="icon feather icon-plus font-14"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-4">
                <div className="card style-2 text-center">
                  <div className="card-body p-2">
                    <Link to="/subscription">
                      <div className="card-icon mb-1">
                        <i className="flaticon flaticon-shuttle font-24 text-primary"></i>
                      </div>
                      <div className="card-content">
                        <p className="font-12 mb-1">My Boosts</p>
                      </div>
                      <i className="icon feather icon-plus font-14"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-4">
                <div className="card style-2 text-center">
                  <div className="card-body p-2">
                    <Link to="/subscription">
                      <div className="card-icon mb-1">
                        <i className="flaticon flaticon-bell font-24 text-primary"></i>
                      </div>
                      <div className="card-content">
                        <p className="font-12 mb-1">Subscriptions</p>
                      </div>
                      <i className="icon feather icon-plus font-14"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="card style-3">
              <div className="card-body">
                <Link to="/edit-profile" className="d-flex align-items-center justify-content-between text-dark text-decoration-none">
                  <div className="d-flex align-items-center gap-3">
                    <i className="flaticon flaticon-pencil-2 text-primary font-20"></i>
                    <div>
                      <h6 className="mb-0 font-14">Edit Profile</h6>
                      <span className="font-12 text-muted">Update bio, pictures and interests</span>
                    </div>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </Link>
              </div>
            </div>

            <div className="card style-3">
              <div className="card-body">
                <Link to="/setting" className="d-flex align-items-center justify-content-between text-dark text-decoration-none">
                  <div className="d-flex align-items-center gap-3">
                    <i className="flaticon flaticon-setting text-primary font-20"></i>
                    <div>
                      <h6 className="mb-0 font-14">Settings</h6>
                      <span className="font-12 text-muted">Discovery, notifications & account</span>
                    </div>
                  </div>
                  <i className="icon feather icon-chevron-right text-muted"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
