import { prisma } from '../src';

async function main() {
  // Create one organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Sample Organization',
    },
  });

  // Create one venue for the organization
  const venue = await prisma.venue.create({
    data: {
      name: 'Main Venue',
      organization_id: organization.id,
      timezone: 'Europe/Moscow',
    },
  });

  // Create two spaces for the venue
  const space1 = await prisma.space.create({
    data: {
      name: 'Conference Room A',
      capacity: 50,
      floor: 1,
      venue_id: venue.id,
    },
  });

  const space2 = await prisma.space.create({
    data: {
      name: 'Conference Room B',
      capacity: 30,
      floor: 2,
      venue_id: venue.id,
    },
  });

  // Create availability records for each space
  await prisma.availability.create({
    data: {
      space_id: space1.id,
      timezone: 'Europe/Moscow',
      rules: {
        interval: {
          start_time: '09:00',
          end_time: '18:00',
          days_of_week: ['MO', 'WE', 'FR'],
          valid_from: '2025-01-01T09:00',
          valid_until: null,
        },
        recurrence_rule: {
          frequency: 'WEEKLY',
          interval: 1,
          until: null,
          byweekday: ['MO', 'WE', 'FR'],
        },
      },
    },
  });

  await prisma.availability.create({
    data: {
      space_id: space2.id,
      timezone: 'Europe/Moscow',
      rules: {
        interval: {
          start_time: '09:00',
          end_time: '18:00',
          days_of_week: ['MO', 'WE', 'FR'],
          valid_from: '2025-01-01T09:00',
          valid_until: null,
        },
        recurrence_rule: {
          frequency: 'WEEKLY',
          interval: 1,
          until: null,
          byweekday: ['MO', 'WE', 'FR'],
        },
      },
    },
  });

  console.log('Seed data created successfully');
}

// execute the main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close Prisma Client at the end
    await prisma.$disconnect();
  });
