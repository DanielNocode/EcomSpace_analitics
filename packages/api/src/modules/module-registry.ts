import { FastifyInstance } from 'fastify';
import type { AnalyticsModule, ModuleManifest } from './module.interface';

/**
 * Module Registry — центральный реестр всех модулей.
 *
 * Управляет жизненным циклом модулей:
 * - Регистрация
 * - Инициализация
 * - Подключение роутов
 * - Проверка зависимостей
 */
class ModuleRegistry {
  private modules: Map<string, AnalyticsModule> = new Map();
  private initialized = false;

  /**
   * Зарегистрировать модуль в реестре.
   */
  register(module: AnalyticsModule): void {
    if (this.initialized) {
      throw new Error(
        `Cannot register module "${module.name}" after initialization`,
      );
    }

    if (this.modules.has(module.name)) {
      throw new Error(`Module "${module.name}" is already registered`);
    }

    this.modules.set(module.name, module);
  }

  /**
   * Инициализировать все модули и подключить роуты.
   * Проверяет зависимости перед запуском.
   */
  async initAll(app: FastifyInstance): Promise<void> {
    // 1. Проверить зависимости
    for (const [name, mod] of this.modules) {
      if (mod.dependencies) {
        for (const dep of mod.dependencies) {
          if (!this.modules.has(dep)) {
            throw new Error(
              `Module "${name}" requires "${dep}" which is not registered`,
            );
          }
        }
      }
    }

    // 2. Инициализировать модули
    for (const [name, mod] of this.modules) {
      if (mod.init) {
        await mod.init();
      }
    }

    // 3. Зарегистрировать роуты каждого модуля
    for (const [name, mod] of this.modules) {
      await app.register(
        async (moduleApp) => {
          await mod.registerRoutes(moduleApp);
        },
        { prefix: `/api/modules/${name}` },
      );
    }

    this.initialized = true;
  }

  /**
   * Получить модуль по имени.
   */
  get(name: string): AnalyticsModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Получить манифесты всех зарегистрированных модулей.
   */
  getManifests(): ModuleManifest[] {
    return Array.from(this.modules.values()).map((mod) => ({
      name: mod.name,
      description: mod.description,
      version: mod.version,
      enabled: true,
      widgets: mod.widgets ?? [],
      routes: [], // будет заполнено после initAll
    }));
  }

  /**
   * Список имён зарегистрированных модулей.
   */
  list(): string[] {
    return Array.from(this.modules.keys());
  }
}

export const moduleRegistry = new ModuleRegistry();
