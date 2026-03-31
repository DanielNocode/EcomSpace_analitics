import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi, OverviewStats, WebinarSummary } from '../lib/api';
import { MetricCard } from '../components/MetricCard';
import { Users, Eye, ShoppingCart, CreditCard, TrendingUp } from 'lucide-react';

function formatRub(val: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
}

// val is already in percentage form (0-100)
function formatPct(val: number) {
  return `${val.toFixed(1)}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [webinars, setWebinars] = useState<WebinarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([analyticsApi.getOverview(), analyticsApi.getWebinars()])
      .then(([o, w]) => {
        setStats(o);
        setWebinars(w.slice(0, 5)); // last 5
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (error) return <div className="text-red-400">Ошибка: {error}</div>;
  if (!stats) return null;

  const trendData = webinars.map(w => ({
    name: formatDate(w.scheduledAt),
    Регистрации: w.registrations,
    Доходимость: w.attendances,
    Заказы: w.orders,
    Оплаты: w.payments,
  })).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Дашборд</h1>
        <p className="text-gray-400 text-sm mt-0.5">Аналитика вебинарных воронок</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Регистрации"
          value={stats.totalRegistrations.toLocaleString('ru-RU')}
          color="blue"
          icon={<Users size={16} />}
        />
        <MetricCard
          title="Доходимость"
          value={stats.totalAttendances.toLocaleString('ru-RU')}
          subtitle={`${formatPct(stats.reachRate)} от регистраций`}
          color="purple"
          icon={<Eye size={16} />}
        />
        <MetricCard
          title="Заказы"
          value={stats.totalOrders.toLocaleString('ru-RU')}
          color="yellow"
          icon={<ShoppingCart size={16} />}
        />
        <MetricCard
          title="Оплаты"
          value={stats.totalPayments.toLocaleString('ru-RU')}
          subtitle={`${formatPct(stats.conversionRate)} конверсия`}
          color="green"
          icon={<CreditCard size={16} />}
        />
      </div>

      <MetricCard
        title="Выручка"
        value={formatRub(stats.totalRevenue)}
        color="green"
        icon={<TrendingUp size={16} />}
      />

      {/* Chart */}
      {trendData.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Динамика по последним вебинарам</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="Регистрации" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Доходимость" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Оплаты" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent webinars */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-600 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Последние вебинары</h2>
          <Link to="/webinars" className="text-xs text-accent hover:text-accent-light">Все →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-dark-600">
                <th className="text-left px-4 py-2">Дата</th>
                <th className="text-right px-4 py-2">Рег.</th>
                <th className="text-right px-4 py-2">Дошли</th>
                <th className="text-right px-4 py-2">Оплаты</th>
                <th className="text-right px-4 py-2">Конверсия</th>
              </tr>
            </thead>
            <tbody>
              {webinars.map(w => (
                <tr key={w.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                  <td className="px-4 py-2">
                    <Link to={`/webinars/${w.id}`} className="text-accent hover:text-accent-light">
                      {formatDate(w.scheduledAt)}
                    </Link>
                  </td>
                  <td className="text-right px-4 py-2 text-gray-300">{w.registrations}</td>
                  <td className="text-right px-4 py-2 text-gray-300">{w.attendances}</td>
                  <td className="text-right px-4 py-2 text-green-400 font-medium">{w.payments}</td>
                  <td className="text-right px-4 py-2 text-gray-400">
                    {w.attendances > 0 ? `${((w.payments / w.attendances) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              {webinars.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                    Нет данных
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
