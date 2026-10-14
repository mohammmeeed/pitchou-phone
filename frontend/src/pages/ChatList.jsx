import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const ChatList = () => {
  const datingCtx = useDating();
  const matches = Array.isArray(datingCtx?.matches) ? datingCtx.matches : [];

  return (
    <div className="page-wrapper">
      <Header title="New Matches" showBack={true} backUrl="/home" />

      <div className="page-content space-top p-b60">
        <div className="container">
          {/* Horizontal scroll of new matches */}
          <div className="d-flex gap-3 overflow-auto pb-3 mb-2" style={{ scrollbarWidth: 'none' }}>
            {matches.map((item) => (
              <div key={item.id} style={{ minWidth: '70px', textAlign: 'center' }}>
                <Link to={`/chat?id=${item.id}`} className={`recent ${item.active ? 'active' : ''} text-decoration-none`}>
                  <div className="media media-60 rounded-circle mx-auto position-relative">
                    <img src={item.image} alt={item.name} className="rounded-circle w-100 h-100" style={{ objectFit: 'cover' }} />
                  </div>
                  <span className="d-block mt-1 font-12 text-dark font-w500">{item.name}</span>
                </Link>
              </div>
            ))}
          </div>

          <div className="title-bar my-3">
            <h6 className="title mb-0">Message</h6>
          </div>

          {/* Messages list */}
          <ul className="message-list list-unstyled">
            {matches.map((item) => (
              <li key={item.id} className={item.active ? 'active' : ''}>
                <Link to={`/chat?id=${item.id}`}>
                  <div className="media media-60">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="media-content">
                    <div>
                      <h6 className="name">{item.name}</h6>
                      <p className="last-msg">{item.lastMsg}</p>
                    </div>
                    <div className="right-content">
                      <span className="date">{item.time}</span>
                      <div className={`seen-btn ${item.active ? 'active' : ''} dz-flex-box`}>
                        <i className="icon feather icon-check"></i>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ChatList;
