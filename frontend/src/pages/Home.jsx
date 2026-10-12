import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import TinderCardStack from '../components/TinderCardStack';
import { useDating } from '../context/DatingContext';

const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profiles } = useDating();

  return (
    <div className="page-wrapper overflow-hidden header-large">
      {/* Header */}
      <Header 
        showMenu={true}
        onMenuClick={() => setSidebarOpen(true)}
        showFilter={true}
        filterUrl="/filter"
        borderZero={true}
      />

      {/* Sidebar Drawer */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Page Content */}
      <div className="home-card-wrapper">
        <div className="home-card-container">
          <TinderCardStack 
            profiles={profiles} 
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;
