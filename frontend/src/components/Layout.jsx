import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  return (
    <div className="layout-container">
      {/* Sidebar navigation */}
      <Sidebar isOpen={mobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />

      {/* Main workspace container */}
      <div className="main-content">
        <Navbar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="content-wrapper">
          <Outlet />
        </main>
      </div>

      {/* Overlay to dismiss mobile sidebar drawer */}
      {mobileMenuOpen && (
        <div 
          onClick={toggleMobileMenu} 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 90
          }}
        />
      )}
    </div>
  );
};

export default Layout;
