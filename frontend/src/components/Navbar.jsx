import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, Shield, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, role, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="navbar">
      <div className="nav-brand">
        <img src="/favicon.svg" alt="BookLeaf" width="28" height="28" style={{ borderRadius: '6px', display: 'block' }} />
        <span>BookLeaf</span>
        <span className="brand-badge">
          {role === 'admin' ? 'Operations Portal' : 'Author Portal'}
        </span>
      </div>

      <div className="nav-user">
        <span className={`user-badge ${role}`}>
          {role === 'admin' ? <Shield size={14} /> : <User size={14} />}
          <span>{user.name}</span>
          <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({user.email})</span>
        </span>

        <button onClick={logout} className="btn-logout" title="Log Out">
          <LogOut size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Sign Out
        </button>
      </div>
    </header>
  );
}
