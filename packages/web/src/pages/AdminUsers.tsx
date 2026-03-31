import React, { useEffect, useState } from 'react';
import { adminApi, UserProfile, CreateUserRequest } from '../lib/api';
import { Plus, Ban, Shield, Edit2, Trash2, RotateCcw } from 'lucide-react';

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user: UserProfile | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    name: user?.name || '',
    password: '',
    role: user?.role || 'VIEWER' as 'ADMIN' | 'VIEWER',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data: any = { email: form.email, name: form.name, role: form.role };
      if (form.password) data.password = form.password;
      if (!user) data.password = form.password; // required for create
      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-5 w-full max-w-md">
        <h2 className="text-white font-semibold mb-4">{user ? 'Редактировать' : 'Создать пользователя'}</h2>

        {error && <div className="mb-3 text-red-400 text-sm bg-red-400/10 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
              className="w-full bg-dark-700 border border-dark-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              className="w-full bg-dark-700 border border-dark-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Пароль {user && '(оставьте пустым — без изменений)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required={!user}
              minLength={6}
              className="w-full bg-dark-700 border border-dark-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Роль</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}
              className="w-full bg-dark-700 border border-dark-500 rounded px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="VIEWER">Viewer (просмотр)</option>
              <option value="ADMIN">Admin (полный доступ)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-400 border border-dark-500 rounded hover:border-gray-400 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm bg-accent hover:bg-accent-dark text-white rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState<UserProfile | null | undefined>(undefined); // undefined=closed, null=create
  const [banModal, setBanModal] = useState<{ user: UserProfile; reason: string } | null>(null);

  const load = () => {
    adminApi.getUsers().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: any) => {
    if (modalUser) {
      await adminApi.updateUser(modalUser.id, data);
    } else {
      await adminApi.createUser(data as CreateUserRequest);
    }
    load();
  };

  const handleBan = async () => {
    if (!banModal) return;
    await adminApi.banUser(banModal.user.id, banModal.reason || undefined);
    setBanModal(null);
    load();
  };

  const handleUnban = async (user: UserProfile) => {
    await adminApi.unbanUser(user.id);
    load();
  };

  const handleDeactivate = async (user: UserProfile) => {
    if (!confirm(`Деактивировать ${user.name}?`)) return;
    await adminApi.deactivateUser(user.id);
    load();
  };

  if (loading) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Пользователи</h1>
        <button
          onClick={() => setModalUser(null)}
          className="flex items-center gap-1.5 text-sm bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Создать
        </button>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-dark-600">
              <th className="text-left px-4 py-3">Пользователь</th>
              <th className="text-left px-4 py-3">Роль</th>
              <th className="text-left px-4 py-3">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-dark-700 hover:bg-dark-700/30">
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{u.name}</div>
                  <div className="text-gray-400 text-xs">{u.email}</div>
                  {u.banned && u.banReason && (
                    <div className="text-red-400 text-xs mt-0.5">Причина бана: {u.banReason}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'ADMIN' ? 'text-accent bg-accent/10' : 'text-gray-400 bg-dark-600'
                  }`}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Заблокирован</span>
                  ) : u.active ? (
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Активен</span>
                  ) : (
                    <span className="text-xs text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">Неактивен</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setModalUser(u)} className="text-gray-500 hover:text-white" title="Редактировать">
                      <Edit2 size={14} />
                    </button>
                    {!u.banned ? (
                      <button onClick={() => setBanModal({ user: u, reason: '' })} className="text-gray-500 hover:text-red-400" title="Заблокировать">
                        <Ban size={14} />
                      </button>
                    ) : (
                      <button onClick={() => handleUnban(u)} className="text-gray-500 hover:text-green-400" title="Разблокировать">
                        <RotateCcw size={14} />
                      </button>
                    )}
                    {u.active && (
                      <button onClick={() => handleDeactivate(u)} className="text-gray-500 hover:text-red-400" title="Деактивировать">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User create/edit modal */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSave={handleSave}
        />
      )}

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-5 w-full max-w-sm">
            <h2 className="text-white font-semibold mb-3">Заблокировать {banModal.user.name}</h2>
            <input
              type="text"
              placeholder="Причина блокировки (необязательно)"
              value={banModal.reason}
              onChange={e => setBanModal(p => p ? { ...p, reason: e.target.value } : null)}
              className="w-full bg-dark-700 border border-dark-500 rounded px-3 py-2 text-sm text-white placeholder-gray-500 mb-3 focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setBanModal(null)} className="flex-1 py-2 text-sm text-gray-400 border border-dark-500 rounded">Отмена</button>
              <button onClick={handleBan} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded">Заблокировать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
