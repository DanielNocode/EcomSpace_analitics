import type { AnalyticsModule } from '../module.interface';
import { registerCoreRoutes } from './routes';

/**
 * Core Module — ядро аналитики вебинарных воронок.
 *
 * Предоставляет:
 * - Обзор всех вебинаров (overview)
 * - Детальную статистику по каждому вебинару
 * - Воронку конверсии
 * - Разбивку по источникам трафика и воронкам
 * - Отложенные оплаты
 * - Настройки системы
 */
export const coreModule: AnalyticsModule = {
  name: 'core',
  description: 'Базовая аналитика вебинарных воронок EcomSpace',
  version: '1.0.0',

  async registerRoutes(app) {
    await registerCoreRoutes(app);
  },

  widgets: [
    {
      id: 'overview-stats',
      title: 'Общая статистика',
      type: 'metric',
      dataEndpoint: '/overview',
    },
    {
      id: 'webinar-funnel',
      title: 'Воронка вебинара',
      type: 'funnel',
      dataEndpoint: '/webinars/:id/funnel',
    },
    {
      id: 'source-breakdown',
      title: 'Разбивка по источникам',
      type: 'table',
      dataEndpoint: '/webinars/:id/by-source',
    },
    {
      id: 'webinar-chart',
      title: 'Динамика по вебинарам',
      type: 'chart',
      dataEndpoint: '/webinars',
    },
  ],
};
