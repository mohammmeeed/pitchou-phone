import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { initialProfiles } from '../context/DatingContext';

const ProfileDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const profile = initialProfiles.find(p => String(p.id) === id) || {
    name: "Chelsea",
    age: 21,
    location: "5 miles away",
    image: "/assets/images/liked/pic2.png",
    bio: "Just moved back to Jakarta after living in Montreal for 10+ years. Coffee lover and spontaneous adventurer.",
    interests: ["Photography", "Music", "Study", "Movies", "Instagram", "Travelling"],
    languages: ["English", "Spanish", "German"]
  };

  return (
    <div className="page-wrapper">
      <Header title="Recommendation" showBack={true} bgWhite={true} />

      <div className="page-content space-top p-b40">
        <div className="container">
          <div className="detail-area">
            <div className="dz-media-card style-2">
              <div className="dz-media">
                <img src={profile.image} alt={profile.name} />
              </div>
              <div className="dz-content">
                <div className="left-content">
                  <h4 className="title">{profile.name}, {profile.age}</h4>
                  <p className="mb-0"><i className="icon feather icon-map-pin"></i> {profile.distance || "5 miles away"}</p>
                </div>
                <a role="button" tabIndex={0} className="dz-icon" style={{ cursor: 'pointer' }}><i className="flaticon flaticon-star-1"></i></a>
              </div>
            </div>

            <div className="detail-bottom-area">
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
