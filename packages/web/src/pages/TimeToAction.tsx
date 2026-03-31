import React, { useEffect, useState } from 'react';
import { analyticsApi, TimeToActionStats } from '../lib/api';
import { MetricCard } from '../components/MetricCard';
import { Clock } from 'lucide-react';

function formatHours(h: number | null): string {
  if (h === null || h === undefined) return '—';
  if (h < 1) return `${Math.round(h * 60)} мин`;
  if (h < 24) return `${h.toFixed(1)} ч`;
  return `${(h / 24).toFixed(1)} дн`;
}

export default function TimeToAction() {
  const [stats, setStats] = useState<TimeToActionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getTimeToAction()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Скорость конверсии</h1>
        <p className="text-gray-400 text-sm mt-0.5">Среднее время между этапами воронки</p>
      </div>

      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              title="Регистрация → Доходимость"
              value={formatHours(stats.registrationToAttendance?.avgHours ?? null)}
              subtitle={`Выборка: ${stats.registrationToAttendance?.sampleSize ?? 0} чел.`}
              color="blue"
              icon={<Clock size={16} />}
            />
            <MetricCard
              title="Доходимость → Заказ"
              value={formatHours(stats.attendanceToOrder?.avgHours ?? null)}
              subtitle={`Выборка: ${stats.attendanceToOrder?.sampleSize ?? 0} чел.`}
              color="yellow"
              icon={<Clock size={16} />}
            />
            <MetricCard
              title="Заказ → Оплата"
              value={formatHours(stats.orderToPayment?.avgHours ?? null)}
              subtitle={`Выборка: ${stats.orderToPayment?.sampleSize ?? 0} чел.`}
              color="green"
              icon={<Clock size={16} />}
            />
          </div>

          <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
            <p className="text-xs text-gray-500">
              Данные помогают понять, где люди «зависают» и нужен дожим.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
