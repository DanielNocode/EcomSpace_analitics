import type { AnalyticsModule } from '../module.interface';

/**
 * Traffic Module — модуль аналитики трафика и окупаемости рекламы.
 *
 * PLACEHOLDER — будет реализован после MVP.
 *
 * Планируемая функциональность:
 * - Ввод рекламных расходов по источникам (таргетологами)
 * - Расчёт ROAS (Return on Ad Spend) по каждому источнику
 * - Расчёт CAC (Cost per Acquisition) по воронкам
 * - Связка рекламных кампаний с UTM-метками
 * - Дашборд окупаемости для руководства
 *
 * Планируемые таблицы (Prisma):
 * - AdSpend: рекламные расходы (date, source, campaign, amount, currency)
 * - AdCampaign: рекламные кампании (name, platform, utmSource, utmMedium, utmCampaign)
 *
 * Планируемые эндпоинты:
 * - POST /ad-spend — ввод расхода
 * - GET /roas — ROAS по кампаниям
 * - GET /cac — CAC по воронкам
 * - GET /overview — сводка по рекламе
 */
export const trafficModule: AnalyticsModule = {
  name: 'traffic',
  description: 'Аналитика трафика и окупаемости рекламы (PLACEHOLDER)',
  version: '0.0.1',
  dependencies: ['core'],

  async registerRoutes(app) {
    // Placeholder endpoint
    app.get('/status', async () => {
      return {
        module: 'traffic',
        status: 'placeholder',
        message: 'Модуль трафика будет доступен в следующей версии',
        plannedFeatures: [
          'Ввод рекламных расходов',
          'ROAS по источникам',
          'CAC по воронкам',
          'Дашборд окупаемости',
        ],
      };
    });
  },

  widgets: [
    {
      id: 'roas-overview',
      title: 'ROAS по источникам',
      type: 'chart',
      dataEndpoint: '/roas',
    },
    {
      id: 'ad-spend-table',
      title: 'Рекламные расходы',
      type: 'table',
      dataEndpoint: '/ad-spend',
    },
  ],
};
