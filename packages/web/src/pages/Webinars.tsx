import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, WebinarSummary } from '../lib/api';
import { Search, ChevronRight } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
  });
}

function formatRub(val: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
}

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Запланирован',
  LIVE: 'В эфире',
  COMPLETED: 'Завершён',
};

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: 'text-blue-400 bg-blue-400/10',
  LIVE: 'text-green-400 bg-green-400/10',
  COMPLETED: 'text-gray-400 bg-gray-400/10',
};

export default function Webinars() {
  const [webinars, setWebinars] = useState<WebinarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.getWebinars()
      .then(setWebinars)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = webinars.filter(w => {
    const q = search.toLowerCase();
    return !q || formatDate(w.scheduledAt).includes(q) || (w.title || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (error) return <div className="text-red-400">Ошибка: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Вебинары</h1>
        <span className="text-xs text-gray-500">{filtered.length} вебинаров</span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск по дате или названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg pl-8 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-dark-600">
                <th className="text-left px-4 py-3">Дата (МСК)</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-right px-4 py-3">Рег.</th>
                <th className="text-right px-4 py-3">Дошли</th>
                <th className="text-right px-4 py-3">Заказы</th>
                <th className="text-right px-4 py-3">Оплаты</th>
                <th className="text-right px-4 py-3">Выручка</th>
                <th className="text-right px-4 py-3">Конверсия</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{formatDate(w.scheduledAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status] || 'text-gray-400'}`}>
                      {STATUS_LABELS[w.status] || w.status}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-gray-300">{w.registrations}</td>
                  <td className="text-right px-4 py-3 text-gray-300">
                    {w.attendances}
                    {w.registrations > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({w.reachRate.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="text-right px-4 py-3 text-gray-300">{w.orders}</td>
                  <td className="text-right px-4 py-3 text-green-400 font-medium">{w.payments}</td>
                  <td className="text-right px-4 py-3 text-gray-300">{formatRub(w.revenue)}</td>
                  <td className="text-right px-4 py-3">
                    <span className={w.conversionRate > 10 ? 'text-green-400' : 'text-gray-400'}>
                      {w.attendances > 0 ? `${w.conversionRate.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/webinars/${w.id}`} className="text-gray-500 hover:text-accent">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {search ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
