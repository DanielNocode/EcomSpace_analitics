import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Turkish/Azerbaijani names for realistic demo data
const firstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Fatih', 'Mustafa', 'Hasan', 'İbrahim', 'Şenol',
  'Kadir', 'Serdar', 'Emre', 'Kerem', 'Cetin', 'Rıza', 'Deniz', 'Ercan',
  'Ayşe', 'Zeynep', 'Türkan', 'Neşe', 'Serpil', 'Sema', 'Gül', 'Meryem',
  'Arzu', 'Leyla', 'Nur', 'Şule', 'Damla', 'Ayla'
];

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çetin', 'Aydın', 'Güzel', 'Özkan',
  'Akman', 'Karataş', 'Başaran', 'Durmuş', 'Ertürk', 'Gültekin', 'Horozoğlu',
  'İlgin', 'Işık', 'Karakaya', 'Koçyiğit', 'Koçak', 'Kötü', 'Kunter'
];

const domains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'mail.com'];
const funnels = ['telegram-bot', 'facebook-ads', 'instagram-reels'];
const utmSources = ['fb', 'ig', 'telegram', 'ytvideo'];
const utmMediums = ['web', 'paid', 'bot', 'ads'];
const products = ['EcomSpace Pro', 'EcomSpace Basic', 'EcomSpace Premium'];

function generatePhone() {
  const prefix = '0' + Math.floor(Math.random() * 9) + '0';
  const middle = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + middle;
}

function generateEmail(firstName, lastName) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${base}@${domain}`;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('Starting database seed...');

  try {
    // Clean existing data
    console.log('Cleaning existing data...');
    await prisma.anomaly.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.registration.deleteMany({});
    await prisma.bizonChatMessage.deleteMany({});
    await prisma.bizonReportViewer.deleteMany({});
    await prisma.bizonReport.deleteMany({});
    await prisma.webinar.deleteMany({});
    await prisma.contact.deleteMany({});

    // 1. Create 3 webinars with past dates and completed status
    console.log('Creating webinars...');
    const webinars = await Promise.all([
      prisma.webinar.create({
        data: {
          id: randomUUID(),
          scheduledAt: new Date('2026-03-25T20:00:00+03:00'), // MSK = UTC+3 = 17:00 UTC
          title: 'Вебинар: Старт в e-commerce',
          status: 'COMPLETED',
        },
      }),
      prisma.webinar.create({
        data: {
          id: randomUUID(),
          scheduledAt: new Date('2026-03-27T20:00:00+03:00'),
          title: 'Секреты масштабирования',
          status: 'COMPLETED',
        },
      }),
      prisma.webinar.create({
        data: {
          id: randomUUID(),
          scheduledAt: new Date('2026-03-30T20:00:00+03:00'),
          title: 'Продвинутые стратегии продаж',
          status: 'COMPLETED',
        },
      }),
    ]);

    console.log(`Created ${webinars.length} webinars`);

    // 2. Create 30 contacts with realistic Turkish/Azerbaijani names
    console.log('Creating contacts...');
    const contacts = [];
    for (let i = 0; i < 30; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const contact = await prisma.contact.create({
        data: {
          id: randomUUID(),
          gcUserId: `gc_user_${String(i + 1).padStart(3, '0')}`,
          email: generateEmail(firstName, lastName),
          phone: generatePhone(),
          name: `${firstName} ${lastName}`,
          firstSeenAt: new Date('2026-03-20'),
        },
      });
      contacts.push(contact);
    }

    console.log(`Created ${contacts.length} contacts`);

    // 3. Create 45 registrations (15 per webinar)
    console.log('Creating registrations...');
    const registrations = [];
    let dealIdCounter = 1;

    for (let w = 0; w < webinars.length; w++) {
      const webinar = webinars[w];
      const webinarDate = webinar.scheduledAt;

      // 15 registrations per webinar
      for (let r = 0; r < 15; r++) {
        const contact = contacts[(w * 10 + r) % contacts.length];
        const isDuplicate = r < 2; // 2 duplicates per webinar (3-4 total)

        const registrationDate = new Date(
          webinarDate.getTime() - randomInt(24, 120) * 60 * 60 * 1000 // 1-5 days before webinar
        );

        const registration = await prisma.registration.create({
          data: {
            id: randomUUID(),
            contactId: contact.id,
            webinarId: webinar.id,
            gcDealId: `gc_reg_${String(dealIdCounter).padStart(3, '0')}`,
            funnel: randomElement(funnels),
            isDuplicate,
            utmSource: randomElement(utmSources),
            utmMedium: randomElement(utmMediums),
            utmCampaign: 'spring_2026',
            utmContent: `webinar_${w + 1}`,
            registeredAt: registrationDate,
          },
        });

        registrations.push(registration);
        dealIdCounter++;
      }
    }

    console.log(`Created ${registrations.length} registrations`);

    // 4. Create 30 attendances (10 per webinar)
    console.log('Creating attendances...');
    const attendances = [];
    dealIdCounter = 1;

    for (let w = 0; w < webinars.length; w++) {
      const webinar = webinars[w];
      const webinarDate = webinar.scheduledAt;

      // 10 attendances per webinar
      for (let a = 0; a < 10; a++) {
        const contact = contacts[(w * 10 + a) % contacts.length];
        const durationMinutes = randomInt(15, 161);

        const attendanceDate = new Date(webinarDate.getTime() + randomInt(0, 180) * 60 * 1000);

        const attendance = await prisma.attendance.create({
          data: {
            id: randomUUID(),
            contactId: contact.id,
            webinarId: webinar.id,
            gcDealId: `gc_att_${String(dealIdCounter).padStart(3, '0')}`,
            attendedAt: attendanceDate,
            durationMinutes,
          },
        });

        attendances.push(attendance);
        dealIdCounter++;
      }
    }

    console.log(`Created ${attendances.length} attendances`);

    // 5. Create 12 orders (4 per webinar)
    console.log('Creating orders...');
    dealIdCounter = 1;

    const orderData = [
      { attributionType: 'DIRECT', attributedWebinarIdx: 0 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 0 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 0 },
      { attributionType: 'DEFERRED', attributedWebinarIdx: 0 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 1 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 1 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 1 },
      { attributionType: 'DEFERRED', attributedWebinarIdx: 1 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 2 },
      { attributionType: 'DIRECT', attributedWebinarIdx: 2 },
      { attributionType: 'DEFERRED', attributedWebinarIdx: 2 },
      { attributionType: 'UNATTRIBUTED', attributedWebinarIdx: null },
    ];

    for (let o = 0; o < 12; o++) {
      const webinarIdx = Math.floor(o / 4);
      const contactIdx = Math.floor(o / 2); // Spread across contacts
      const contact = contacts[contactIdx];
      const attendance = attendances[o]; // Use corresponding attendance

      const orderedAt = new Date(webinars[webinarIdx].scheduledAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000);

      const status = randomInt(1, 10) <= 9 ? 'PAID' : 'NEW'; // 9 PAID, 3 NEW
      const paidAt = status === 'PAID' ? new Date(orderedAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000) : null;

      const attributedWebinarId = orderData[o].attributionType !== 'UNATTRIBUTED'
        ? webinars[orderData[o].attributedWebinarIdx].id
        : null;

      await prisma.order.create({
        data: {
          id: randomUUID(),
          contactId: contact.id,
          attributedWebinarId,
          lastAttendanceId: attendance.id,
          gcDealId: `gc_ord_${String(dealIdCounter).padStart(3, '0')}`,
          status,
          amount: randomInt(5000, 15000),
          productName: randomElement(products),
          attributionType: orderData[o].attributionType,
          orderedAt,
          paidAt,
        },
      });

      dealIdCounter++;
    }

    console.log('Created 12 orders');

    // 6. Create 5 anomalies
    console.log('Creating anomalies...');
    await Promise.all([
      prisma.anomaly.create({
        data: {
          id: randomUUID(),
          type: 'LOW_REACH_RATE',
          severity: 'MEDIUM',
          message: 'Reach rate for webinar is below expected threshold',
          webinarId: webinars[0].id,
          resolved: false,
          detectedAt: new Date('2026-03-26T10:00:00Z'),
        },
      }),
      prisma.anomaly.create({
        data: {
          id: randomUUID(),
          type: 'HIGH_DUPLICATE_RATE',
          severity: 'LOW',
          message: 'Duplicate registration rate detected',
          metadata: { duplicateCount: 4, percentage: 8.9 },
          resolved: false,
          detectedAt: new Date('2026-03-27T15:30:00Z'),
        },
      }),
      prisma.anomaly.create({
        data: {
          id: randomUUID(),
          type: 'ZERO_ORDERS',
          severity: 'HIGH',
          message: 'No orders received from webinar',
          webinarId: webinars[1].id,
          resolved: false,
          detectedAt: new Date('2026-03-28T09:00:00Z'),
        },
      }),
      prisma.anomaly.create({
        data: {
          id: randomUUID(),
          type: 'UNUSUAL_UTM',
          severity: 'LOW',
          message: 'Unusual UTM parameter detected',
          metadata: { utmSource: 'direct', frequency: 5 },
          resolved: false,
          detectedAt: new Date('2026-03-29T14:20:00Z'),
        },
      }),
      prisma.anomaly.create({
        data: {
          id: randomUUID(),
          type: 'REGISTRATION_SPIKE',
          severity: 'MEDIUM',
          message: 'Unusual spike in registrations detected',
          metadata: { hourlyRate: 18, normalRate: 3 },
          webinarId: webinars[2].id,
          resolved: true,
          detectedAt: new Date('2026-03-30T18:00:00Z'),
        },
      }),
    ]);

    console.log('Created 5 anomalies');

    console.log('\nSeed completed successfully!');
    console.log(`
Summary:
- Webinars: ${webinars.length}
- Contacts: ${contacts.length}
- Registrations: ${registrations.length}
- Attendances: ${attendances.length}
- Orders: 12
- Anomalies: 5
    `);
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
