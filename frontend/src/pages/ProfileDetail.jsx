import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { initialProfiles } from '../context/DatingContext';

const ProfileDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const profile = initialProfiles.find(p => String(p.id) === id) || initialProfiles[0];

  return (
    <div className="page-wrapper">
      <Header title="Recommendation" showBack={true} bgWhite={true} />

      <div className="page-content space-top p-b40">
        <div className="container">
          <div className="detail-area">
            <div className="dz-media-card style-2 recommendation-media-animate">
              <div className="dz-media">
                {profile.video ? (
                  <video src={profile.video} poster={profile.image} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={profile.image} alt={profile.name} />
                )}
              </div>
              <div className="dz-content">
                <div className="left-content">
                  <h4 className="title">{profile.name} {profile.author ? `• ${profile.author}` : ''}</h4>
                  <p className="mb-0"><i className="icon feather icon-book-open"></i> {profile.format || "Édition Reliée"}</p>
                </div>
                <a role="button" tabIndex={0} className="dz-icon" style={{ cursor: 'pointer' }}><i className="flaticon flaticon-star-1"></i></a>
              </div>
            </div>

            <div className="detail-bottom-area recommendation-details-animate">
              <div className="about">
                <h6 className="title">Basic information</h6>
                <p className="para-text">{profile.bio}</p>					
              </div>

              <div className="intrests mb-3">
                <h6 className="title">Interests</h6>
                <ul className="dz-tag-list">
                  {profile.interests?.map((item) => (
                    <li key={item}> 
                      <div className="dz-tag">
                        <i className="icon feather icon-tag me-1"></i>
                        <span>{item}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="languages mb-3">
                <h6 className="title">Languages</h6>
                <ul className="dz-tag-list">
                  {profile.languages?.map((lang) => (
                    <li key={lang}> 
                      <div className="dz-tag">
                        <span>{lang}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="footer fixed">
        <div className="dz-icon-box">
          <Link to="/home" className="icon dz-flex-box dislike">
            <i className="flaticon flaticon-cross font-18"></i>
          </Link>
          <Link to="/home" className="icon dz-flex-box super-like">
            <i className="fa-solid fa-star"></i>
          </Link>
          <Link to="/wishlist" className="icon dz-flex-box like">
            <i className="fa-solid fa-heart"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
