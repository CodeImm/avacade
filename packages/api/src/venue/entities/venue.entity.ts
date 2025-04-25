import { ApiProperty } from '@nestjs/swagger';
import type { Venue as PrismaVenue } from '@repo/db';

export class Venue implements PrismaVenue {
  @ApiProperty({
    description: 'Unique identifier of the venue (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the venue',
    example: 'Main Hall',
  })
  name!: string;

  @ApiProperty({
    description: 'ID of the associated organization',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Creation time of the venue',
    type: String,
    format: 'date-time',
    example: '2025-04-25T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update time of the venue',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:30:00Z',
  })
  updatedAt!: Date;
}
