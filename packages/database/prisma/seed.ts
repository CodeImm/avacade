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
      organizationId: organization.id,
    },
  });

  // Create two spaces for the venue
  const space1 = await prisma.space.create({
    data: {
      name: 'Conference Room A',
      capacity: 50,
      floor: 1,
      venueId: venue.id,
    },
  });

  const space2 = await prisma.space.create({
    data: {
      name: 'Conference Room B',
      capacity: 30,
      floor: 2,
      venueId: venue.id,
    },
  });

  // Create availability records for each space
  await prisma.availability.create({
    data: {
      spaceId: space1.id,
    },
  });

  await prisma.availability.create({
    data: {
      spaceId: space2.id,
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
