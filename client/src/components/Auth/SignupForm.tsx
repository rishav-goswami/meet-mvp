import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(username, email || undefined, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-gray-400">Sign up to get started</p>
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
            minLength={3}
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
            <Mail size={14} /> Email (Optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="your.email@example.com"
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
            minLength={6}
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
            <Lock size={14} /> Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-blue-400 hover:text-blue-300 text-sm transition"
        >
          Already have an account? <span className="font-semibold">Sign in</span>
        </button>
      </div>
    </div>
  );
};

