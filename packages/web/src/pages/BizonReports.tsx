import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../lib/api';
import { Calendar, Eye, Users, ChevronRight, FileText, Clock, Trash2 } from 'lucide-react';

interface BizonReport {
  id: string;
  webinarId: string | null;
  roomId: string;
  roomTitle: string | null;
  startedAt: string;
  durationMinutes: number;
  peakViewers: number;
  totalViewers: number;
  commentsCount: number;
  avgWatchPercent: number | null;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });
}

export default function BizonReports() {
  const [reports, setReports] = useState<BizonReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi.getBizonReports()
      .then(setReports as any)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Don't navigate to detail page
    e.stopPropagation();
    if (!confirm('Удалить этот отчёт? Это действие нельзя отменить.')) return;
    try {
      await analyticsApi.deleteBizonReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert('Ошибка удаления: ' + err.message);
    }
  };

  if (loading) return <div className="text-gray-400 animate-pulse">Загрузка...</div>;
  if (error) return <div className="text-red-400">Ошибка: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Bizon365 Отчёты</h1>
        <p className="text-gray-400 text-sm mt-0.5">Отчёты о просмотрах вебинаров</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-8 text-center">
          <FileText size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Отчётов пока нет</p>
          <p className="text-gray-500 text-sm mt-1">Загрузите CSV-отчёт из Bizon365 через вебхук</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Link
              key={report.id}
              to={`/bizon-reports/${report.id}`}
              className="block bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-dark-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-white font-medium">{report.roomTitle ?? report.roomId}</div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(report.startedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {report.durationMinutes} мин
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right ml-6">
                  <div>
                    <div className="text-white font-semibold">{report.totalViewers}</div>
                    <div className="text-gray-500 text-xs">зрителей</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{report.peakViewers}</div>
                    <div className="text-gray-500 text-xs">пик</div>
                  </div>
                  {report.avgWatchPercent !== null && (
                    <div>
                      <div className="text-white font-semibold">{report.avgWatchPercent.toFixed(1)}%</div>
                      <div className="text-gray-500 text-xs">досмотр</div>
                    </div>
                  )}
                  <div>
                    <div className="text-white font-semibold">{report.commentsCount}</div>
                    <div className="text-gray-500 text-xs">сообщений</div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, report.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-2 p-1 rounded hover:bg-red-400/10"
                    title="Удалить отчёт"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-gray-500 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
