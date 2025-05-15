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

  @ApiPropertyOptional({
    description: 'Detailed description of the event template',
    example:
      'A relaxing 60-minute yoga session focused on flexibility and breathing.',
    type: String,
  })
  description!: string | null;

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
  price!: number | null;

  @ApiProperty({
    description: 'Whether the template is currently active and usable',
    example: true,
    type: Boolean,
    default: true,
  })
  is_active!: boolean;

  @ApiProperty({
    description: 'List of associated space IDs where this template is valid',
    example: ['space1-id', 'space2-id'],
    type: [String],
    default: [],
  })
  space_ids!: string[];

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
