/**
 * Filter Builder — преобразует фильтры из API в Prisma where-условия.
 *
 * Поддерживает:
 * - Простые фильтры: даты, UTM, воронки, webinarId
 * - Custom labels (JSON-фильтрация)
 * - Комбинированные фильтры AND/OR (вложенные группы)
 */

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'in' | 'gte' | 'lte' | 'between';
  value: string | string[] | number | [string, string];
}

interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
}

interface AnalyticsFilter {
  dateFrom?: string;
  dateTo?: string;
  webinarId?: string;
  funnel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  customLabels?: Record<string, string>;
  advanced?: FilterGroup;
}

// Маппинг полей фильтра → полей Prisma
const FIELD_MAP: Record<string, string> = {
  funnel: 'funnel',
  utm_source: 'utmSource',
  utmSource: 'utmSource',
  utm_medium: 'utmMedium',
  utmMedium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utmCampaign: 'utmCampaign',
  utm_content: 'utmContent',
  utmContent: 'utmContent',
  utm_term: 'utmTerm',
  utmTerm: 'utmTerm',
  status: 'status',
  attribution_type: 'attributionType',
  attributionType: 'attributionType',
  product_name: 'productName',
  productName: 'productName',
};

function resolvePrismaField(field: string): string {
  return FIELD_MAP[field] ?? field;
}

/**
 * Преобразует одно условие фильтра в Prisma where.
 */
function buildCondition(condition: FilterCondition): Record<string, any> {
  const field = resolvePrismaField(condition.field);

  switch (condition.operator) {
    case 'eq':
      return { [field]: condition.value };
    case 'neq':
      return { [field]: { not: condition.value } };
    case 'contains':
      return { [field]: { contains: condition.value as string, mode: 'insensitive' } };
    case 'in':
      return { [field]: { in: condition.value as string[] } };
    case 'gte':
      return { [field]: { gte: condition.value } };
    case 'lte':
      return { [field]: { lte: condition.value } };
    case 'between': {
      const [from, to] = condition.value as [string, string];
      return { [field]: { gte: from, lte: to } };
    }
    default:
      return {};
  }
}

/**
 * Рекурсивно строит Prisma where из группы фильтров (AND/OR).
 */
function buildGroup(group: FilterGroup): Record<string, any> {
  const prismaConditions = group.conditions.map((item) => {
    if ('logic' in item) {
      return buildGroup(item as FilterGroup);
    }
    return buildCondition(item as FilterCondition);
  });

  if (group.logic === 'OR') {
    return { OR: prismaConditions };
  }
  return { AND: prismaConditions };
}

/**
 * Строит Prisma where-условие для registrations из AnalyticsFilter.
 */
export function buildRegistrationWhere(filter: AnalyticsFilter): Record<string, any> {
  const where: any = {};
  const conditions: any[] = [];

  // Date range по registeredAt
  if (filter.dateFrom || filter.dateTo) {
    const dateCondition: any = {};
    if (filter.dateFrom) dateCondition.gte = new Date(filter.dateFrom);
    if (filter.dateTo) dateCondition.lte = new Date(filter.dateTo);
    conditions.push({ registeredAt: dateCondition });
  }

  // WebinarId
  if (filter.webinarId) {
    conditions.push({ webinarId: filter.webinarId });
  }

  // Funnel
  if (filter.funnel) {
    conditions.push({ funnel: filter.funnel });
  }

  // UTMs
  if (filter.utmSource) conditions.push({ utmSource: filter.utmSource });
  if (filter.utmMedium) conditions.push({ utmMedium: filter.utmMedium });
  if (filter.utmCampaign) conditions.push({ utmCampaign: filter.utmCampaign });
  if (filter.utmContent) conditions.push({ utmContent: filter.utmContent });
  if (filter.utmTerm) conditions.push({ utmTerm: filter.utmTerm });

  // Custom labels (JSON path filtering)
  if (filter.customLabels) {
    for (const [key, value] of Object.entries(filter.customLabels)) {
      conditions.push({
        customLabels: { path: [key], equals: value },
      });
    }
  }

  // Advanced filters (AND/OR groups)
  if (filter.advanced) {
    conditions.push(buildGroup(filter.advanced));
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}

/**
 * Строит Prisma where-условие для webinars из AnalyticsFilter.
 */
export function buildWebinarWhere(filter: AnalyticsFilter): Record<string, any> {
  const where: any = {};

  if (filter.dateFrom || filter.dateTo) {
    where.scheduledAt = {};
    if (filter.dateFrom) where.scheduledAt.gte = new Date(filter.dateFrom);
    if (filter.dateTo) where.scheduledAt.lte = new Date(filter.dateTo);
  }

  if (filter.webinarId) {
    where.id = filter.webinarId;
  }

  return where;
}

/**
 * Строит Prisma where-условие для orders из AnalyticsFilter.
 */
export function buildOrderWhere(filter: AnalyticsFilter): Record<string, any> {
  const where: any = {};
  const conditions: any[] = [];

  if (filter.dateFrom || filter.dateTo) {
    const dateCondition: any = {};
    if (filter.dateFrom) dateCondition.gte = new Date(filter.dateFrom);
    if (filter.dateTo) dateCondition.lte = new Date(filter.dateTo);
    conditions.push({ orderedAt: dateCondition });
  }

  if (filter.webinarId) {
    conditions.push({ attributedWebinarId: filter.webinarId });
  }

  // Advanced filters
  if (filter.advanced) {
    conditions.push(buildGroup(filter.advanced));
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}

/**
 * Парсит query параметры в AnalyticsFilter.
 */
export function parseFilterFromQuery(query: Record<string, any>): AnalyticsFilter {
  const filter: AnalyticsFilter = {};

  if (query.dateFrom) filter.dateFrom = query.dateFrom;
  if (query.dateTo) filter.dateTo = query.dateTo;
  if (query.webinarId) filter.webinarId = query.webinarId;
  if (query.funnel) filter.funnel = query.funnel;
  if (query.utmSource) filter.utmSource = query.utmSource;
  if (query.utmMedium) filter.utmMedium = query.utmMedium;
  if (query.utmCampaign) filter.utmCampaign = query.utmCampaign;
  if (query.utmContent) filter.utmContent = query.utmContent;
  if (query.utmTerm) filter.utmTerm = query.utmTerm;

  // Custom labels come as customLabels[key]=value
  if (query.customLabels && typeof query.customLabels === 'object') {
    filter.customLabels = query.customLabels;
  }

  // Advanced filter comes as JSON in body (POST) or as JSON string in query
  if (query.advanced) {
    try {
      filter.advanced = typeof query.advanced === 'string'
        ? JSON.parse(query.advanced)
        : query.advanced;
    } catch {
      // ignore invalid JSON
    }
  }

  return filter;
}
