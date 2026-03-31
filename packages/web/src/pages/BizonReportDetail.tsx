import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bizonApi } from '../lib/api';
import {
  Clock, Users, Eye, MessageSquare, ArrowLeft, AlertCircle,
  TrendingDown, MousePointer, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });
}

interface ReportAnalytics {
  report: {
    id: string;
    webinarId: string | null;
    roomId: string;
    roomTitle: string | null;
    startedAt: string;
    durationMinutes: number;
    peakViewers: number;
    totalViewers: number;
    commentsCount: number;
    avgWatchPercent: number;
    buttonClicks: number;
    bannerClicks: number;
    orderPageViews: number;
  };
  retentionCurve: Array<{ minute: number; viewers: number }>;
  topViewers: Array<{
    name: string | null;
    email: string | null;
    durationMin: number | null;
    watchPercent: number | null;
    madeOrder: boolean;
    clickedButton: boolean;
    utmSource: string | null;
  }>;
  chatCount: number;
}

export default function BizonReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    bizonApi.getReport(id)
      .then((d: any) => setData(d))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-400 animate-pulse">Загрузка...</div>;
  if (error) return (
    <div className="flex items-center gap-2 text-red-400">
      <AlertCircle size={16} />
      Ошибка: {error}
    </div>
  );
  if (!data) return null;

  const { report, retentionCurve, topViewers } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/bizon-reports')}
          className="p-2 text-gray-400 hover:text-white bg-dark-800 border border-dark-600 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{report.roomTitle ?? report.roomId}</h1>
          <p className="text-gray-400 text-sm">{formatDate(report.startedAt)}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Всего зрителей', value: report.totalViewers, icon: <Users size={16} /> },
          { label: 'Пиковая аудитория', value: report.peakViewers, icon: <Eye size={16} /> },
          { label: 'Длительность', value: `${report.durationMinutes} мин`, icon: <Clock size={16} /> },
          { label: 'Ср. досмотр', value: `${report.avgWatchPercent?.toFixed(1) ?? 0}%`, icon: <TrendingDown size={16} /> },
          { label: 'Кликов по кнопке', value: report.buttonClicks, icon: <MousePointer size={16} /> },
          { label: 'Кликов по баннеру', value: report.bannerClicks, icon: <MousePointer size={16} /> },
          { label: 'Просм. страницы заказа', value: report.orderPageViews, icon: <BarChart3 size={16} /> },
          { label: 'Сообщений в чате', value: report.commentsCount, icon: <MessageSquare size={16} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">{icon}{label}</div>
            <div className="text-white text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* Retention curve */}
      {retentionCurve && retentionCurve.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Кривая удержания аудитории</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={retentionCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="minute"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                tickFormatter={v => `${v} мин`}
                interval={Math.floor(retentionCurve.length / 10)}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelFormatter={v => `Минута ${v}`}
                formatter={(v: any) => [v, 'Зрители']}
              />
              <Line type="monotone" dataKey="viewers" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top viewers */}
      {topViewers && topViewers.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-600">
            <h2 className="text-white font-medium">Топ зрителей по досмотру</h2>
          </div>
          <table className="w-full">
            <thead className="bg-dark-700 border-b border-dark-600">
              <tr className="text-xs text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Имя</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-right">Досмотрел</th>
                <th className="px-4 py-2 text-right">Минут</th>
                <th className="px-4 py-2 text-center">Заказ</th>
                <th className="px-4 py-2 text-left">Источник</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {topViewers.slice(0, 15).map((v, i) => (
                <tr key={i} className="hover:bg-dark-700/50 text-sm">
                  <td className="px-4 py-2 text-white">{v.name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-400">{v.email ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-white">{v.watchPercent?.toFixed(1) ?? 0}%</td>
                  <td className="px-4 py-2 text-right text-gray-400">{v.durationMin ?? 0}</td>
                  <td className="px-4 py-2 text-center">
                    {v.madeOrder ? (
                      <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded-full">Да</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{v.utmSource ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
