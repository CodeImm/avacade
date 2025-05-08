import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { EventTemplate as PrismaEventTemplate } from '@repo/db';

export class EventTemplate implements PrismaEventTemplate {
  @ApiProperty({
    description: 'Unique identifier of the event template (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id!: string;

  @ApiProperty({
    description: 'Title of the event template',
    example: 'Yoga with Anna',
    type: String,
  })
  title!: string;

  @ApiProperty({
    description: 'Duration of the event template in minutes',
    example: 60,
    type: Number,
  })
  duration!: number;

  @ApiPropertyOptional({
    description: 'Price in whole units (e.g., rubles)',
    example: 1500,
    minimum: 0,
    type: Number,
  })
  price?: number;

  @ApiProperty({
    description: 'Indicates whether the template is accessible to clients',
    example: true,
    type: Boolean,
    default: false,
  })
  is_client_accessible!: boolean;

  @ApiProperty({
    description:
      'If true, bookings created from this template will be auto-confirmed',
    example: true,
    type: Boolean,
    default: false,
  })
  auto_confirm!: boolean;

  @ApiProperty({
    description: 'Creation timestamp of the event template (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description:
      'Last update timestamp of the event template (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  updated_at!: Date;
}
