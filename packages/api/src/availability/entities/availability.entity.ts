import { ApiProperty } from '@nestjs/swagger';
import type { Availability as PrismaAvailability } from '@repo/db';

export class Availability implements Omit<PrismaAvailability, 'rules'> {
  @ApiProperty({
    description: 'Unique identifier of the availability (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the associated venue',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  venueId!: string | null;

  @ApiProperty({
    description: 'ID of the associated space',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  spaceId!: string | null;

  @ApiProperty({
    description: 'Creation time',
    type: String,
    format: 'date-time',
    example: '2025-04-25T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Update time',
    type: String,
    format: 'date-time',
    example: '2025-04-25T12:00:00Z',
  })
  updatedAt!: Date;
}
