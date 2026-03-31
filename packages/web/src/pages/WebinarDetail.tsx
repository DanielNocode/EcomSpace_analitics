import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
}

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const width = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{count.toLocaleString('ru-RU')}</span>
      </div>
      <div className="h-6 bg-dark-700 rounded-md overflow-hidden">
        <div
          className="h-full rounded-md transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function WebinarDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      analyticsApi.getWebinar(id),
      analyticsApi.getWebinarFunnel(id),
      analyticsApi.getWebinarBySource(id),
    ])
      .then(([d, f, s]) => {
        setDetail(d);
        setFunnel(f);
        setSources(s || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (!detail) return <div className="text-red-400">Вебинар не найден</div>;

  // detail shape: { webinar: {...}, stats: {...}, bizonReport: null }
  const webinar = detail.webinar ?? detail;
  const stats = detail.stats ?? {};

  // funnel is an array: [{ stage, count, conversionFromPrev }]
  const funnelArr: Array<{ stage: string; count: number; conversionFromPrev: number | null }> = Array.isArray(funnel) ? funnel : [];
  const funnelMax = funnelArr.length > 0 ? Math.max(funnelArr[0].count, 1) : 1;
  const funnelColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/webinars" className="text-gray-500 hover:text-accent">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">
            {webinar.title || fmt(webinar.scheduledAt)}
          </h1>
          <p className="text-gray-400 text-sm">{fmt(webinar.scheduledAt)} (МСК)</p>
        </div>
      </div>

      {/* Stats overview */}
      {stats.registrations !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Регистрации', val: stats.registrations, color: 'text-blue-400' },
            { label: 'Доходимость', val: stats.attendances, color: 'text-purple-400' },
            { label: 'Заказы', val: stats.orders, color: 'text-yellow-400' },
            { label: 'Оплаты', val: stats.payments, color: 'text-green-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{(val ?? 0).toLocaleString('ru-RU')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Funnel */}
      {funnelArr.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
          <h2 className="text-sm font-medium text-white mb-4">Воронка конверсии</h2>
          <div className="space-y-3">
            {funnelArr.map((step, i) => (
              <FunnelBar
                key={step.stage}
                label={step.stage}
                count={step.count}
                max={funnelMax}
                color={funnelColors[i] ?? '#6b7280'}
              />
            ))}
          </div>
          {funnelArr.length >= 2 && (
            <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-dark-600">
              <div className="text-center">
                <p className="text-xs text-gray-500">Доходимость</p>
                <p className="text-lg font-bold text-purple-400">
                  {funnelArr[1].conversionFromPrev !== null ? `${funnelArr[1].conversionFromPrev}%` : '—'}
                </p>
              </div>
              {funnelArr.length >= 4 && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">Конверсия (оплаты)</p>
                  <p className="text-lg font-bold text-green-400">
                    {funnelArr[3].conversionFromPrev !== null ? `${funnelArr[3].conversionFromPrev}%` : '—'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
          <h2 className="text-sm font-medium text-white mb-3">Разбивка по источникам</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-dark-600">
                  <th className="text-left pb-2">Источник</th>
                  <th className="text-right pb-2">Рег.</th>
                  <th className="text-right pb-2">Дошли</th>
                  <th className="text-right pb-2">Оплаты</th>
                  <th className="text-right pb-2">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {sources.slice(0, 20).map((s: any, i: number) => (
                  <tr key={i} className="border-b border-dark-700">
                    <td className="py-1.5 text-gray-300">{s.source || s.utmSource || s.funnel || '—'}</td>
                    <td className="text-right py-1.5 text-gray-300">{s.registrations || 0}</td>
                    <td className="text-right py-1.5 text-gray-300">{s.attendances || 0}</td>
                    <td className="text-right py-1.5 text-green-400">{s.payments || 0}</td>
                    <td className="text-right py-1.5 text-gray-400">
                      {s.attendances > 0 ? `${(((s.payments || 0) / s.attendances) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bizon report if available */}
      {detail.bizonReport && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
          <h2 className="text-sm font-medium text-white mb-3">Bizon365 отчёт</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Пик зрителей</p>
              <p className="text-xl font-bold text-blue-400">{detail.bizonReport.peakViewers}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Всего зрителей</p>
              <p className="text-xl font-bold text-purple-400">{detail.bizonReport.totalViewers}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Досмотрено</p>
              <p className="text-xl font-bold text-green-400">{detail.bizonReport.avgWatchPercent?.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
