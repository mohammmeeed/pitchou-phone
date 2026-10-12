import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

const exploreItems = [
  {
    title: "Free Tonight",
    desc: "Down for something spontaneous",
    image: "/assets/images/explore/pic1.png"
  },
  {
    title: "Looking for Love",
    desc: "Sweep me off my feet",
    image: "/assets/images/explore/pic2.png"
  },
  {
    title: "Let's be Friends",
    desc: "Maybe even besties",
    image: "/assets/images/explore/pic3.png"
  },
  {
    title: "Coffee Date",
    desc: "Take me to your favorite cafe",
    image: "/assets/images/explore/pic4.png"
  },
  {
    title: "Get Photo Verified",
    desc: "Get Verified",
    image: "/assets/images/explore/pic5.png"
  }
];

const Explore = () => {
  return (
    <div className="page-wrapper">
      <Header title="Explore" showBack={true} backUrl="/home" />

      <div className="page-content space-top p-b60">
        <div className="container">
          <div className="row g-3">
            {exploreItems.map((item, idx) => (
              <div key={idx} className="col-md-6 col-12">
                <div className="dz-media-card style-3">
                  <div className="dz-media">
                    <img src={item.image} alt={item.title} />
                  </div>
                  <div className="dz-content">
                    <h3 className="title">{item.title}</h3>
                    <p>{item.desc}</p>
                    <Link to="/home" className="btn btn-light rounded-xl">
                      JOIN NOW
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
