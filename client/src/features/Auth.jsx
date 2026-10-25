import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers3, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../stores/app';
import { send, errorMessage } from '../api/client';
import { Button, Field, ErrorBox } from '../components/ui';
export default function Auth({
  mode = 'login'
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [message, setMessage] = useState(null),
    [show, setShow] = useState(false);
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const login = useAuth(s => s.login),
    navigate = useNavigate();
  const isLogin = mode === 'login',
    forgot = mode === 'forgot-password';
  const titles = {
    login: 'Welcome back.',
    'forgot-password': 'Reset your password.',
    'reset-password': 'Choose a new password.',
    'accept-invitation': 'Your workspace is ready.'
  };
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isLogin) {
        await login({
          email,
          password
        });
        navigate('/app', {
          replace: true
        });
      } else {
        const result = await send('post', `/auth/${mode}`, forgot ? {
          email
        } : {
          token,
          password
        });
        setMessage(result.message);
        if (!forgot) {
          history.replaceState(null, '', location.pathname);
          setPassword('');
        }
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return <div className="auth-page"><aside className="auth-brand"><Link className="brand" to="/login"><img src="/favicon.svg" alt="" />DevOrbia</Link><div className="auth-pitch"><span className="eyebrow">PEOPLE. PROJECTS. CLARITY.</span><h1>Better decisions.<br />Better delivery.</h1><p>Bring your teams, development work, and delivery intelligence into one focused workspace.</p><div className="auth-illustration"><div><Layers3 size={24} /><strong>One connected workspace</strong><span>Teams → Projects → Delivery</span></div><div><ShieldCheck size={24} /><strong>Built around your organization</strong><span>Clear roles. Controlled access.</span></div></div></div><small>Development management, with people at the center.</small></aside><main className="auth-main"><div className="auth-card"><div className="eyebrow">YOUR DEVORBIA WORKSPACE</div><h1>{titles[mode]}</h1><p>{isLogin ? 'Sign in with your organization account.' : forgot ? 'We’ll send recovery instructions if your account is active.' : 'Set a strong password to secure your account.'}</p><ErrorBox error={error} />{message ? <div role="status" className="success-box">{message}<Link to="/login">Return to sign in <ArrowRight size={15} /></Link></div> : <form onSubmit={submit}>{(isLogin || forgot) && <Field label="Work email"><input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></Field>}{!forgot && <Field label={isLogin ? 'Password' : 'New password'} hint={!isLogin ? 'At least 12 characters. A unique passphrase works well.' : null}><div className="password-input"><input required type={show ? 'text' : 'password'} minLength={isLogin ? 1 : 12} maxLength={128} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>}{isLogin && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}{!isLogin && !forgot && !token && <ErrorBox error="Open the complete invitation or reset link from your email." />}<Button busy={busy} disabled={!isLogin && !forgot && !token} type="submit" className="full">{isLogin ? 'Sign in' : forgot ? 'Send recovery instructions' : 'Set password'}<ArrowRight size={17} /></Button></form>}{!isLogin && <Link className="back-login" to="/login">Back to sign in</Link>}<div className="auth-note"><ShieldCheck size={18} /><span>Access is by invitation. Contact your organization administrator for an account.</span></div></div></main></div>;
}
