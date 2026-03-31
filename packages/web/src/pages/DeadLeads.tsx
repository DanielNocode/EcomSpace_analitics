import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../lib/api';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export default function DeadLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    analyticsApi.getDeadLeads({ daysSince: String(days) })
      .then(setLeads)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Мёртвые лиды</h1>
          <p className="text-gray-400 text-sm mt-0.5">Зарегистрировались, но ни разу не пришли</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-dark-800 border border-dark-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value={14}>14 дней</option>
          <option value={30}>30 дней</option>
          <option value={60}>60 дней</option>
          <option value={90}>90 дней</option>
        </select>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-dark-600 text-xs text-gray-500">
          {loading ? 'Загрузка...' : `${leads.length} контактов`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-dark-600">
                <th className="text-left px-4 py-3">Имя</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Телефон</th>
                <th className="text-left px-4 py-3">Регистрация</th>
                <th className="text-left px-4 py-3">Воронка</th>
                <th className="text-left px-4 py-3">UTM</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l: any) => (
                <tr key={l.contactId || l.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                  <td className="px-4 py-2 text-white">{l.contact?.name || l.name || '—'}</td>
                  <td className="px-4 py-2 text-gray-300 text-xs">{l.contact?.email || l.email || '—'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{l.contact?.phone || l.phone || '—'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{l.registeredAt ? fmt(l.registeredAt) : '—'}</td>
                  <td className="px-4 py-2 text-xs">
                    {l.funnel && <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{l.funnel}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{l.utmSource || '—'}</td>
                </tr>
              ))}
              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Мёртвых лидов нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
