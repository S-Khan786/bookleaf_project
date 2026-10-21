import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, ArrowRight, AlertCircle } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: '#e8f0fe', borderRadius: '16px', marginBottom: '12px' }}>
            <BookOpen size={36} color="#1e3a5f" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e3a5f' }}>BookLeaf Publishing</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Author Support & Operations Communication Portal
          </p>
        </div>

        {/* Main Login Card */}
        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px', color: '#1e3a5f' }}>Sign In</h2>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.875rem', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '12px' }}>
              Quick 1-Click Demo Accounts (Pre-Seeded)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', textAlign: 'left', background: '#fef3c7', borderColor: '#fde68a' }}
                onClick={() => handleDemoLogin('admin@bookleaf.com', 'admin123')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 600 }}>
                  <Shield size={14} /> Admin / Operations Lead
                </span>
                <span style={{ fontSize: '0.75rem', color: '#78350f' }}>admin@bookleaf.com</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', textAlign: 'left' }}
                onClick={() => handleDemoLogin('priya.sharma@email.com', 'author123')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Priya Sharma (Pending Royalty)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AUTH001</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', textAlign: 'left' }}
                onClick={() => handleDemoLogin('rohit.kapoor@email.com', 'author123')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Rohit Kapoor (High Seller)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AUTH002</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', textAlign: 'left' }}
                onClick={() => handleDemoLogin('sneha.kulkarni@email.com', 'author123')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Sneha Kulkarni (Production Stage)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AUTH007</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
