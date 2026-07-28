import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { Sun, Moon, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = ({ toggleMobileMenu }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Toggle Menu">
          <Menu size={22} />
        </button>
        <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
          Smart Support Desk
        </span>
      </div>

      <div className="navbar-right">
        {user && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Session: <strong style={{ color: 'var(--text-main)' }}>{user.role_name}</strong>
          </span>
        )}
        <NotificationBell />
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Light/Dark Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
