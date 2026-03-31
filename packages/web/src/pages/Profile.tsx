import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { Mail, Lock, User, Calendar, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setError('Новый пароль должен содержать не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess('Пароль успешно изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e.message || 'Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-white">Профиль</h1>
        <p className="text-gray-400 text-sm mt-0.5">Информация об аккаунте</p>
      </div>

      {/* User info card */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <User size={20} className="text-accent" />
          </div>
          <div>
            <div className="text-white font-medium">{user?.name}</div>
            <div className="text-gray-400 text-sm">{user?.role === 'ADMIN' ? 'Администратор' : 'Наблюдатель'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dark-600">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Mail size={12} />
              Email
            </div>
            <div className="text-white text-sm">{user?.email}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Calendar size={12} />
              Дата регистрации
            </div>
            <div className="text-white text-sm">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-accent" />
          <h2 className="text-white font-medium">Смена пароля</h2>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-4 py-3 text-sm mb-4">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/30 rounded-lg px-4 py-3 text-sm mb-4">
            <Check size={14} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Текущий пароль</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-accent"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Новый пароль</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-accent"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Подтверждение нового пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </form>
      </div>
    </div>
  );
}
