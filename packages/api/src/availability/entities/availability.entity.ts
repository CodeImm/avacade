import { ApiProperty } from '@nestjs/swagger';
import type { Availability as PrismaAvailability } from '@repo/db';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { AvailabilityRulesDto } from '../../rules/dto/availability-rules.dto';

export class Availability implements PrismaAvailability {
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
    description: 'Rules in JSON format',
    type: AvailabilityRulesDto,
    example: {
      intervals: [
        {
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: ['MO', 'TU'],
          valid_from: null,
          valid_until: null,
        },
      ],
      exceptions: [
        {
          date: '2025-05-02',
          status: 'CLOSED',
          start_time: null,
          end_time: null,
        },
      ],
      recurrence_rule: {
        frequency: 'WEEKLY',
        interval: 1,
        until: null,
        byweekday: ['MO', 'TU'],
      },
    },
  })
  @ValidateNested()
  @Type(() => AvailabilityRulesDto)
  rules!: AvailabilityRulesDto;

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
