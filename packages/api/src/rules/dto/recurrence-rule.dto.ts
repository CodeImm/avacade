import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { DayOfWeek, RecurrenceFrequency } from '../types';

export class RecurrenceRuleDto {
  @ApiProperty({
    description: 'Recurrence frequency',
    enum: RecurrenceFrequency,
    example: 'WEEKLY',
  })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @ApiProperty({ description: 'Recurrence interval', example: 1 })
  @IsNumber()
  interval!: number;

  @ApiProperty({
    description: 'Recurrence end date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  until!: string | null;

  @ApiProperty({
    description: 'Days of the week for recurrence',
    enum: DayOfWeek,
    isArray: true,
    nullable: true,
    example: ['MO', 'TU'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  byweekday!: DayOfWeek[] | null;
}
