import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';

function Mark() {
  return <span className="auth-mark"><span>✦</span></span>;
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/register', { email, password });
      navigate('/login');
    } catch {
      setError('That email may already be registered. Try signing in instead.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page-signup">
      <div className="auth-noise" />
      <section className="auth-story">
        <div className="auth-brand"><Mark /><span>ChaiGPT</span></div>
        <div className="auth-story-copy"><span className="auth-kicker">Make space for better questions</span><h1>Your next<br /><em>thought starts here.</em></h1><p>Save your conversations, explore ideas, and build a private rhythm with your AI workspace.</p></div>
        <div className="auth-stamp"><span>02</span><span>Built for momentum</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Mark /><span>ChaiGPT</span></div>
          <div className="auth-heading"><span className="auth-kicker">Start fresh</span><h2>Create your space.</h2><p>Your conversations belong to you.</p></div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSignup} className="auth-form">
            <label>Email address<input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Create password<input type="password" required autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label>Confirm password<input type="password" required autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Creating your space...' : 'Create account'}<span>↗</span></button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in <span>→</span></Link></p>
          <p className="auth-legal">Your account is used only to protect your private workspace.</p>
        </div>
      </section>
    </main>
  );
}
