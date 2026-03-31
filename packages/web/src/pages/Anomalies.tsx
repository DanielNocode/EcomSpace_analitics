import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: 'text-red-400 bg-red-400/10 border-red-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  LOW: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
};

const TYPE_LABELS: Record<string, string> = {
  LOW_REACH_RATE: 'Низкая доходимость',
  ZERO_PAYMENTS_WITH_ORDERS: 'Нулевые оплаты при наличии заказов',
  REGISTRATION_SPIKE: 'Всплеск регистраций',
};

export default function Anomalies() {
  const { isAdmin } = useAuth();
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const load = (resolved?: boolean) => {
    setLoading(true);
    analyticsApi.getAnomalies(resolved)
      .then(setAnomalies)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(showResolved ? undefined : false);
  }, [showResolved]);

  const handleResolve = async (id: string) => {
    try {
      await analyticsApi.resolveAnomaly(id);
      load(showResolved ? undefined : false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Аномалии</h1>
          <p className="text-gray-400 text-sm">Автоматически обнаруженные проблемы</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Показать решённые
        </label>
      </div>

      {loading && <div className="text-gray-400 text-sm">Загрузка...</div>}

      <div className="space-y-3">
        {anomalies.map((a: any) => (
          <div
            key={a.id}
            className={`border rounded-xl p-4 ${SEVERITY_COLORS[a.severity] || 'text-gray-400 bg-dark-800 border-dark-600'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{TYPE_LABELS[a.type] || a.type}</p>
                  <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {new Date(a.detectedAt).toLocaleString('ru-RU')}
                    {a.resolved && ' · Решено'}
                  </p>
                </div>
              </div>
              {isAdmin && !a.resolved && (
                <button
                  onClick={() => handleResolve(a.id)}
                  className="shrink-0 text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <CheckCircle size={14} />
                  Решено
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && anomalies.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {showResolved ? 'Аномалий нет' : 'Активных аномалий нет'}
          </div>
        )}
      </div>
    </div>
  );
}
