import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { EventRequest as PrismaEventRequest } from '@repo/db';
import { EventRequestStatus } from '../types';

export class EventRequest implements PrismaEventRequest {
  @ApiProperty({
    description: 'Unique identifier of the event request',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the associated event template',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  event_template_id!: string;

  @ApiProperty({
    description: 'Preferred time for the event in ISO 8601 format',
    example: '2025-05-15T18:00:00Z',
  })
  preferred_time!: Date;

  @ApiProperty({
    description: 'Snapshot of the event template title at the time of request',
    example: 'Individual Math Lesson',
  })
  title_snapshot!: string;

  @ApiPropertyOptional({
    description: 'Snapshot of the event template description',
    example: 'One-on-one math tutoring session',
  })
  description_snapshot!: string | null;

  @ApiProperty({
    description: 'Snapshot of the event duration in minutes',
    example: 60,
  })
  duration_snapshot!: number;

  @ApiPropertyOptional({
    description: 'Snapshot of the event price',
    example: 1000,
  })
  price_snapshot!: number | null;

  @ApiProperty({
    description: 'Status of the event request',
    example: 'PENDING',
    enum: EventRequestStatus,
  })
  status!: string;

  @ApiPropertyOptional({
    description: 'Comment provided by the client',
    example: 'Prepare for final exam',
  })
  comment!: string | null;

  @ApiProperty({
    description:
      'Snapshot of the space IDs associated with the event template at the time of request',
    example: ['space-uuid-1', 'space-uuid-2'],
    type: [String],
  })
  space_ids_snapshot!: string[];

  @ApiPropertyOptional({
    description: 'Response comment from the manager or tutor',
    example: 'Confirmed for 18:00',
  })
  response_comment!: string | null;

  @ApiProperty({
    description: 'Creation timestamp of the event request',
    example: '2025-05-11T10:00:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Last update timestamp of the event request',
    example: '2025-05-11T12:00:00Z',
  })
  updated_at!: Date;
}
