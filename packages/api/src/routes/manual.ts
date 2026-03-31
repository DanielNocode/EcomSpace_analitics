import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { parseBizonXlsx, storeBizonReport } from '../services/bizon-report.service';

// ── Types ──

interface CreateContactPayload {
  name: string;
  email?: string;
  phone?: string;
  gcUserId?: string;
}

interface UpdateContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  gcUserId?: string;
}

interface CreateRegistrationPayload {
  contactId: string;
  webinarId: string;
  funnel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

interface CreateAttendancePayload {
  contactId: string;
  webinarId: string;
  durationMinutes: number;
}

interface CreateOrderPayload {
  contactId: string;
  amount: number;
  productName: string;
  attributedWebinarId?: string;
  lastAttendanceId?: string;
}

interface CreateWebinarPayload {
  title: string;
  scheduledAt: string; // ISO datetime
}

// ── Helper Functions ──

/**
 * Finds the last attendance for a contact within the last 72 hours
 */
async function findLastAttendanceWithin72h(contactId: string) {
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  return prisma.attendance.findFirst({
    where: {
      contactId,
      attendedAt: {
        gte: seventyTwoHoursAgo,
      },
    },
    orderBy: {
      attendedAt: 'desc',
    },
  });
}

/**
 * Auto-attribution logic for orders
 * If last attendance within 72h exists: DIRECT
 * Otherwise: DEFERRED (no webinar attribution)
 */
async function determineOrderAttribution(
  contactId: string,
  attributedWebinarId?: string,
  lastAttendanceId?: string
) {
  // If both are explicitly provided, use them as-is
  if (attributedWebinarId && lastAttendanceId) {
    return {
      attributionType: 'DIRECT' as const,
      attributedWebinarId,
      lastAttendanceId,
    };
  }

  // Find last attendance within 72h
  const lastAttendance = await findLastAttendanceWithin72h(contactId);

  if (lastAttendance) {
    return {
      attributionType: 'DIRECT' as const,
      attributedWebinarId: lastAttendance.webinarId,
      lastAttendanceId: lastAttendance.id,
    };
  }

  // No recent attendance: DEFERRED
  return {
    attributionType: 'DEFERRED' as const,
    attributedWebinarId: null,
    lastAttendanceId: null,
  };
}

// ── Route Handler ──

export async function manualRoute(app: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // CONTACTS
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/manual/contacts
   * List contacts with pagination and search
   * Query: ?page=1&limit=20&search=name|email|phone
   */
  app.get('/contacts', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Math.max(1, (request.query as any).page ? parseInt((request.query as any).page) : 1);
    const limit = Math.min(100, (request.query as any).limit ? parseInt((request.query as any).limit) : 20);
    const search = (request.query as any).search ? String((request.query as any).search).trim() : '';

    const skip = (page - 1) * limit;

    let whereClause: any = {};
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { firstSeenAt: 'desc' },
      }),
      prisma.contact.count({ where: whereClause }),
    ]);

    return reply.send({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * POST /api/manual/contacts
   * Create a new contact
   */
  app.post('/contacts', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body as CreateContactPayload;

    if (!payload.name && !payload.email && !payload.phone && !payload.gcUserId) {
      return reply.status(400).send({
        error: 'At least one identifier (name, email, phone, or gcUserId) is required',
      });
    }

    try {
      const contact = await prisma.contact.create({
        data: {
          name: payload.name || null,
          email: payload.email || null,
          phone: payload.phone || null,
          gcUserId: payload.gcUserId || null,
        },
      });

      return reply.status(201).send(contact);
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'Contact with this email, phone, or gcUserId already exists',
        });
      }
      throw err;
    }
  });

  /**
   * PUT /api/manual/contacts/:id
   * Update a contact
   */
  app.put('/contacts/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const contactId = (request.params as any).id;
    const payload = request.body as UpdateContactPayload;

    try {
      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          name: payload.name !== undefined ? payload.name : undefined,
          email: payload.email !== undefined ? payload.email : undefined,
          phone: payload.phone !== undefined ? payload.phone : undefined,
          gcUserId: payload.gcUserId !== undefined ? payload.gcUserId : undefined,
        },
      });

      return reply.send(contact);
    } catch (err) {
      if ((err as any).code === 'P2025') {
        return reply.status(404).send({ error: 'Contact not found' });
      }
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'Contact with this email, phone, or gcUserId already exists',
        });
      }
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // WEBINARS
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/manual/webinars
   * List all webinars (for dropdowns in forms)
   */
  app.get('/webinars', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const webinars = await prisma.webinar.findMany({
      orderBy: { scheduledAt: 'desc' },
    });

    return reply.send(webinars);
  });

  /**
   * POST /api/manual/webinars
   * Create a new webinar
   */
  app.post('/webinars', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body as CreateWebinarPayload;

    if (!payload.title || !payload.scheduledAt) {
      return reply.status(400).send({
        error: 'title and scheduledAt are required',
      });
    }

    try {
      const scheduledAt = new Date(payload.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        return reply.status(400).send({
          error: 'Invalid scheduledAt format. Use ISO 8601 datetime.',
        });
      }

      const webinar = await prisma.webinar.create({
        data: {
          title: payload.title,
          scheduledAt,
        },
      });

      return reply.status(201).send(webinar);
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'A webinar with this scheduledAt already exists',
        });
      }
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // REGISTRATIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/manual/registrations
   * Create a registration for a contact on a webinar
   * Auto-generates gcDealId as manual_reg_${timestamp}
   * Sets registeredAt to now
   */
  app.post('/registrations', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body as CreateRegistrationPayload;

    if (!payload.contactId || !payload.webinarId) {
      return reply.status(400).send({
        error: 'contactId and webinarId are required',
      });
    }

    try {
      // Verify contact and webinar exist
      const [contact, webinar] = await Promise.all([
        prisma.contact.findUnique({ where: { id: payload.contactId } }),
        prisma.webinar.findUnique({ where: { id: payload.webinarId } }),
      ]);

      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }
      if (!webinar) {
        return reply.status(404).send({ error: 'Webinar not found' });
      }

      // Check for duplicate registration
      const existingReg = await prisma.registration.findFirst({
        where: {
          contactId: payload.contactId,
          webinarId: payload.webinarId,
        },
      });

      const isDuplicate = existingReg !== null;

      const gcDealId = `manual_reg_${Date.now()}`;
      const now = new Date();

      const registration = await prisma.registration.create({
        data: {
          contactId: payload.contactId,
          webinarId: payload.webinarId,
          gcDealId,
          funnel: payload.funnel || null,
          isDuplicate,
          utmSource: payload.utmSource || null,
          utmMedium: payload.utmMedium || null,
          utmCampaign: payload.utmCampaign || null,
          utmContent: payload.utmContent || null,
          utmTerm: payload.utmTerm || null,
          registeredAt: now,
        },
      });

      return reply.status(201).send(registration);
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'A registration with this gcDealId already exists',
        });
      }
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // ATTENDANCES
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/manual/attendances
   * Record an attendance for a contact on a webinar
   * Auto-generates gcDealId as manual_att_${timestamp}
   * Sets attendedAt to now
   */
  app.post('/attendances', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body as CreateAttendancePayload;

    if (!payload.contactId || !payload.webinarId || payload.durationMinutes === undefined) {
      return reply.status(400).send({
        error: 'contactId, webinarId, and durationMinutes are required',
      });
    }

    try {
      // Verify contact and webinar exist
      const [contact, webinar] = await Promise.all([
        prisma.contact.findUnique({ where: { id: payload.contactId } }),
        prisma.webinar.findUnique({ where: { id: payload.webinarId } }),
      ]);

      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }
      if (!webinar) {
        return reply.status(404).send({ error: 'Webinar not found' });
      }

      const gcDealId = `manual_att_${Date.now()}`;
      const now = new Date();

      const attendance = await prisma.attendance.create({
        data: {
          contactId: payload.contactId,
          webinarId: payload.webinarId,
          gcDealId,
          durationMinutes: payload.durationMinutes,
          attendedAt: now,
        },
      });

      return reply.status(201).send(attendance);
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'An attendance with this gcDealId already exists',
        });
      }
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/manual/orders
   * Create an order for a contact
   * Auto-attribution: finds last attendance within 72h
   * If found: attributionType=DIRECT, links to that webinar & attendance
   * If not found: attributionType=DEFERRED, no webinar/attendance links
   */
  app.post('/orders', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.body as CreateOrderPayload;

    if (!payload.contactId || payload.amount === undefined || !payload.productName) {
      return reply.status(400).send({
        error: 'contactId, amount, and productName are required',
      });
    }

    try {
      // Verify contact exists
      const contact = await prisma.contact.findUnique({
        where: { id: payload.contactId },
      });

      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }

      // Determine attribution
      const attribution = await determineOrderAttribution(
        payload.contactId,
        payload.attributedWebinarId,
        payload.lastAttendanceId
      );

      const gcDealId = `manual_order_${Date.now()}`;
      const now = new Date();

      const order = await prisma.order.create({
        data: {
          contactId: payload.contactId,
          amount: payload.amount,
          productName: payload.productName,
          gcDealId,
          attributionType: attribution.attributionType,
          attributedWebinarId: attribution.attributedWebinarId,
          lastAttendanceId: attribution.lastAttendanceId,
          orderedAt: now,
          status: 'NEW',
        },
      });

      return reply.status(201).send(order);
    } catch (err) {
      if ((err as any).code === 'P2002') {
        return reply.status(409).send({
          error: 'An order with this gcDealId already exists',
        });
      }
      if ((err as any).code === 'P2003') {
        return reply.status(400).send({
          error: 'Referenced webinar or attendance does not exist',
        });
      }
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // BIZON REPORT UPLOAD
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/manual/bizon-upload
   * Upload and parse a Bizon report XLSX file
   * Returns report summary
   */
  app.post('/bizon-upload', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'No file provided',
        });
      }

      const file = data as MultipartFile;
      const filename = file.filename;

      // Validate XLSX extension
      if (!filename.toLowerCase().endsWith('.xlsx')) {
        return reply.status(400).send({
          error: 'Only XLSX files are accepted',
        });
      }

      // Read file buffer
      const buffer = await file.toBuffer();

      // Parse Bizon report
      const parsedReport = await parseBizonXlsx(buffer);

      // Store report in database
      const report = await storeBizonReport(parsedReport, filename);

      return reply.status(201).send({
        id: report.id,
        roomId: report.roomId,
        roomTitle: report.roomTitle,
        startedAt: report.startedAt,
        durationMinutes: report.durationMinutes,
        peakViewers: report.peakViewers,
        totalViewers: report.totalViewers,
        totalOrders: report.totalOrders,
        totalRevenue: report.totalRevenue,
        message: 'Bizon report uploaded and parsed successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse or store report';
      return reply.status(400).send({
        error: message,
      });
    }
  });
}
