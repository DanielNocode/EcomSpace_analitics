/**
 * Login Page Component
 * Provides authentication interface with email and password inputs
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!email.trim()) {
        setError('Пожалуйста, введите электронную почту');
        setIsSubmitting(false);
        return;
      }

      if (!password) {
        setError('Пожалуйста, введите пароль');
        setIsSubmitting(false);
        return;
      }

      // Attempt login
      await login(email, password);

      // Navigate to dashboard on success
      navigate('/');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ошибка при входе. Пожалуйста, проверьте учетные данные.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-dark-800 rounded-2xl border border-dark-600 p-8 shadow-2xl">
          {/* Logo and Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4 shadow-lg">
              <BarChart3 size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white text-center">EcomSpace Analytics</h1>
            <p className="text-gray-400 text-sm mt-2 text-center">Вход в личный кабинет</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Электронная почта
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full transition-all"
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input w-full transition-all"
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className={`btn-primary w-full py-3 font-semibold rounded-lg transition-all ${
                isSubmitting || loading
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:shadow-lg hover:shadow-accent/20'
              }`}
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Загрузка...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-xs mt-6">
            Платформа аналитики для электронной коммерции
          </p>
        </div>

        {/* Demo Credentials Hint */}
        <div className="mt-6 p-4 rounded-lg bg-dark-800/50 border border-dark-600 text-center text-gray-400 text-xs">
          <p>Для демо используйте учетные данные, полученные от администратора</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
