import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { DayOfWeek } from '../types';

export class TimeIntervalDto {
  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  start_time!: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '17:00' })
  @IsString()
  end_time!: string;

  @ApiProperty({
    description: 'Days of the week',
    enum: DayOfWeek,
    isArray: true,
    example: ['MO', 'TU'],
  })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  days_of_week!: DayOfWeek[];

  @ApiProperty({
    description: 'Valid from date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-05-01',
  })
  @IsOptional()
  @IsDateString()
  valid_from!: string | null;

  @ApiProperty({
    description: 'Valid until date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  valid_until!: string | null;
}
