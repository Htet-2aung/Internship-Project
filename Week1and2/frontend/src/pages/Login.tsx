import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuthStore } from '../store/useAuthStore';

function Mark() {
  return <span className="auth-mark"><span>✦</span></span>;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string }>('/auth/login', { email, password });
      login(response.data.token);
      navigate('/chat');
    } catch {
      setError('We could not sign you in. Check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-noise" />
      <section className="auth-story">
        <div className="auth-brand"><Mark /><span>ChaiGPT</span></div>
        <div className="auth-story-copy"><span className="auth-kicker">A quieter way to think</span><h1>Bring your<br /><em>curiosity.</em></h1><p>A private AI workspace for questions, ideas, and the work that matters to you.</p></div>
        <div className="auth-stamp"><span>01</span><span>Private by design</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Mark /><span>ChaiGPT</span></div>
          <div className="auth-heading"><span className="auth-kicker">Welcome back</span><h2>Good to see you.</h2><p>Sign in to continue your conversations.</p></div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleLogin} className="auth-form">
            <label>Email address<input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<div className="password-field"><input type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} /><span>•••</span></div></label>
            <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Opening workspace...' : 'Sign in'}<span>↗</span></button>
          </form>
          <p className="auth-switch">New here? <Link to="/signup">Create an account <span>→</span></Link></p>
          <p className="auth-legal">By continuing, you agree to use ChaiGPT responsibly.</p>
        </div>
      </section>
    </main>
  );
}
