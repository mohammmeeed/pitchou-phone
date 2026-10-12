import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useDating } from '../context/DatingContext';

const Wishlist = () => {
  const { likedList } = useDating();

  return (
    <div className="page-wrapper">
      <Header 
        title="Liked you" 
        showBack={true} 
        backUrl="/home"
        showFilter={true}
        filterUrl="/filter"
      />

      <div className="page-content space-top p-b65">
        <div className="container">
          <div className="row g-2">
            {likedList.map((item) => (
              <div key={item.id} className="col-6">
                <div className="dz-media-card">
                  <Link to={`/profile-detail?id=${item.id}`}>
                    <div className="dz-media">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="dz-content">
                      <h6 className="title">{item.name}</h6>	
                      <span className="about">{item.school}</span>	
                    </div>
                  </Link>
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

export default Wishlist;
