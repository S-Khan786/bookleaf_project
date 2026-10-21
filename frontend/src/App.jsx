import React from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { AuthorPortal } from './pages/AuthorPortal';
import { AdminPortal } from './pages/AdminPortal';

export function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>Loading BookLeaf Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Navbar />
      {role === 'admin' ? <AdminPortal /> : <AuthorPortal />}
    </div>
  );
}

export default App;
