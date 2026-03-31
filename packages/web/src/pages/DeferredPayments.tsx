import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../lib/api';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRub(val: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
}

const ATTR_LABELS: Record<string, string> = {
  DEFERRED: 'Отложенный',
  UNATTRIBUTED: 'Не атрибутирован',
};

export default function DeferredPayments() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.getDeferred()
      .then(setOrders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (error) return <div className="text-red-400">Ошибка: {error}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Отложенные оплаты</h1>
        <p className="text-gray-400 text-sm mt-0.5">Заказы, оплаченные позже 72ч после вебинара или без атрибуции</p>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-dark-600">
                <th className="text-left px-4 py-3">Контакт</th>
                <th className="text-left px-4 py-3">Тип</th>
                <th className="text-right px-4 py-3">Сумма</th>
                <th className="text-left px-4 py-3">Заказ</th>
                <th className="text-left px-4 py-3">Оплата</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                  <td className="px-4 py-2">
                    <div className="text-white text-xs">{o.contact?.name || o.contact?.email || '—'}</div>
                    <div className="text-gray-500 text-xs">{o.contact?.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                      {ATTR_LABELS[o.attributionType] || o.attributionType}
                    </span>
                  </td>
                  <td className="text-right px-4 py-2 text-green-400 font-medium">
                    {o.amount ? formatRub(parseFloat(o.amount)) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{o.orderedAt ? fmt(o.orderedAt) : '—'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{o.paidAt ? fmt(o.paidAt) : '—'}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Нет отложенных оплат</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
