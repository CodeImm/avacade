import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateRecurrenceRuleDto } from '../../rules/dto/create-recurrence-rule.dto';
import { CreateTimeIntervalDto } from '../../rules/dto/create-time-interval.dto';
import { RecurrenceRuleDto } from '../../rules/dto/recurrence-rule.dto';
import { EventStatus } from '../types';

export class CreateEventDto {
  @ApiProperty({
    description:
      'Identifier of the space where the event takes place (UUID, optional)',
    example: '223e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  @IsUUID()
  space_id!: string;

  @ApiProperty({
    description: 'Title of the event',
    example: 'Yoga with Anna',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Time zone of the event in IANA format',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({
    description: 'Time interval',
    type: () => CreateTimeIntervalDto,
    example: {
      start_date: '2025-05-05T23:00:00Z',
      end_date: '2025-05-06T01:00:00Z',
    },
  })
  @ValidateNested()
  @Type(() => CreateTimeIntervalDto)
  interval!: CreateTimeIntervalDto;

  @ApiPropertyOptional({
    description: 'Recurrence rule',
    type: RecurrenceRuleDto,
    example: {
      frequency: 'WEEKLY',
      interval: 1,
      until: null,
      byweekday: ['MO', 'TU'],
    },
  })
  @ValidateNested()
  @Type(() => CreateRecurrenceRuleDto)
  @IsOptional()
  recurrence_rule?: CreateRecurrenceRuleDto;

  @ApiProperty({
    description: 'Status of the event',
    enum: EventStatus,
    example: EventStatus.PLANNED,
    default: EventStatus.PLANNED,
  })
  @IsEnum(EventStatus)
  status!: EventStatus;
}
