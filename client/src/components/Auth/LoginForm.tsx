import React, { useState } from 'react';
import { LogIn, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400">Sign in to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
            <User size={14} /> Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
            <Lock size={14} /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          <LogIn size={20} />
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToSignup}
          className="text-blue-400 hover:text-blue-300 text-sm transition"
        >
          Don't have an account? <span className="font-semibold">Sign up</span>
        </button>
      </div>
    </div>
  );
};

