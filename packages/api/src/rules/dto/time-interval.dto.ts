import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { DayOfWeek } from '../types';

export class TimeIntervalDto {
  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:mm format',
  })
  start_time!: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:mm format',
  })
  end_time!: string;

  @ApiProperty({
    description: 'Days of the week',
    enum: DayOfWeek,
    isArray: true,
    example: ['MO', 'TU'],
  })
  @IsArray({ message: 'days_of_week must be an array' })
  @IsEnum(DayOfWeek, {
    each: true,
    message: 'Each day must be a valid DayOfWeek value',
  })
  @IsOptional()
  days_of_week?: DayOfWeek[];

  @ApiProperty({
    description: 'Valid from date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-05-01',
  })
  @IsDateString(
    {
      strict: true,
    },
    {
      message: 'valid_from must be a valid ISO date string (YYYY-MM-DD)',
    },
  )
  valid_from!: string | null;

  @ApiProperty({
    description: 'Valid until date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-12-31',
  })
  @IsDateString(
    {
      strict: true,
    },
    {
      message: 'valid_until must be a valid ISO date string (YYYY-MM-DD)',
    },
  )
  valid_until!: string | null;
}
