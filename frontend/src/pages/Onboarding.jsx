import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    title: "Start Your Dating Story",
    desc: "Your companion for meaningful connections"
  },
  {
    title: "Begin Your Chapter of Love",
    desc: "Embrace the dating world armed with tools and support"
  },
  {
    title: "Your Journey of Connection",
    desc: "Explore essentials and delights that boost confidence"
  }
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="page-wrapper">
      <div className="content-body">
        <div className="welcome-area bg-image">
          <div className="welcome-inner">
            <div className="dz-media">
              <img src="/assets/images/onboarding/pic1.png" alt="onboarding" />
            </div>

            <div className="swiper get-started" style={{ minHeight: '140px' }}>
              <div className="swiper-wrapper">
                <div className="swiper-slide swiper-slide-active">
                  <div className="slide-info">
                    <div className="started">
                      <h2 className="title mb-3">{slides[currentSlide].title}</h2>
                      <p>{slides[currentSlide].desc}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="swiper-btn mt-3">
                <div className="swiper-pagination style-1 flex-1 d-flex justify-content-center gap-1">
                  {slides.map((_, idx) => (
                    <span 
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`swiper-pagination-bullet ${currentSlide === idx ? 'swiper-pagination-bullet-active' : ''}`}
                      style={{ cursor: 'pointer' }}
                    ></span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-btn container">
            <Link to="/login" className="btn btn-lg btn-gradient w-100 dz-flex-box btn-shadow rounded-xl">
              Find Someone
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
