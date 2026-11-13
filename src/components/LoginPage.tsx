import { useState, type FormEvent } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : String(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">IC</div>
        <p className="login-eyebrow">INCIDENT RESPONSE</p>
        <h1 id="login-title">AI Incident Copilot</h1>
        <p className="muted">Sign in with the administrator account to continue.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              maxLength={254}
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              minLength={12}
              maxLength={72}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
