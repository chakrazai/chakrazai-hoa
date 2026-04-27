import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '../hooks/useStore';
import { Button, Input } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-navy-700 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">HOAConnect</h1>
            <p className="text-xs text-slate-500">Management Platform</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
          <h2 className="text-xl font-display text-slate-900 mb-6">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email address" type="email" placeholder="you@yourhoa.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />

            {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Forgot your password?{' '}
            <a href="mailto:support@hoaconnect.com" className="text-navy-600 hover:underline">Contact support</a>
          </p>
        </div>

        {/* Dev shortcut — remove in production */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Demo: admin@demo.com / password123
        </p>
      </div>
    </div>
  );
}
