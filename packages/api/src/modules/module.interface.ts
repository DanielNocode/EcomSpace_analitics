import { FastifyInstance } from 'fastify';

/**
 * Module interface — контракт для всех модулей EcomSpace Analytics.
 *
 * Каждый модуль — это изолированный блок функциональности,
 * который может регистрировать свои роуты, сервисы и Prisma-модели.
 *
 * Примеры модулей:
 * - core: базовая аналитика вебинаров (реги, участия, заказы, оплаты)
 * - traffic: данные по рекламе и окупаемости трафика
 * - crm: расширенная работа с контактами и сегментами
 */
export interface AnalyticsModule {
  /** Уникальное имя модуля (kebab-case) */
  name: string;

  /** Описание модуля */
  description: string;

  /** Версия модуля */
  version: string;

  /**
   * Инициализация модуля.
   * Вызывается при старте приложения.
   * Здесь модуль может проверить зависимости, прогреть кэши и т.д.
   */
  init?(): Promise<void>;

  /**
   * Регистрация роутов модуля в Fastify.
   * Каждый модуль получает свой префикс: /api/modules/{moduleName}/
   */
  registerRoutes(app: FastifyInstance): Promise<void>;

  /**
   * Опциональные метаданные для UI — какие дашборд-виджеты модуль предоставляет.
   */
  widgets?: ModuleWidget[];

  /**
   * Зависимости от других модулей.
   */
  dependencies?: string[];
}

export interface ModuleWidget {
  /** Уникальный ID виджета внутри модуля */
  id: string;

  /** Название для UI */
  title: string;

  /** Тип виджета */
  type: 'chart' | 'table' | 'metric' | 'funnel';

  /** Эндпоинт для данных (относительно модуля) */
  dataEndpoint: string;
}

export interface ModuleManifest {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  widgets: ModuleWidget[];
  routes: string[];
}
