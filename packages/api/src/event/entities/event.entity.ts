import { ApiProperty } from '@nestjs/swagger';
import type { Event as PrismaEvent } from '@repo/db';
import { EventStatus } from '../types';

export class Event implements PrismaEvent {
  @ApiProperty({
    description: 'Unique identifier of the event (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id!: string;

  @ApiProperty({
    description:
      'Identifier of the space where the event takes place (UUID, optional)',
    example: '223e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  spaceId!: string;

  @ApiProperty({
    description: 'Title of the event',
    example: 'Yoga with Anna',
    type: String,
  })
  title!: string;

  @ApiProperty({
    description: 'Start time of the event (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  startTime!: Date;

  @ApiProperty({
    description: 'End time of the event (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  endTime!: Date;

  @ApiProperty({
    description: 'Status of the event',
    enum: EventStatus,
    example: EventStatus.PLANNED,
  })
  status!: EventStatus;

  @ApiProperty({
    description: 'Creation timestamp of the event (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp of the event (ISO 8601 format)',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  updatedAt!: Date;
}
