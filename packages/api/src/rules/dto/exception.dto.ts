import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ExceptionStatus } from '../types';

export class ExceptionDto {
  @ApiProperty({
    description: 'Exception date in YYYY-MM-DD format',
    example: '2025-05-02',
  })
  @IsDateString(
    {
      strict: true,
    },
    {
      message: 'Date must be a valid ISO date string (YYYY-MM-DD)',
    },
  )
  date!: string;

  @ApiProperty({
    description: 'Status of the exception',
    enum: ExceptionStatus,
    example: 'CLOSED',
  })
  @IsEnum(ExceptionStatus, {
    message: 'Status must be a valid ExceptionStatus value',
  })
  status!: ExceptionStatus;

  @ApiPropertyOptional({
    description: 'Start time in HH:mm format',
    nullable: true,
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:mm format',
  })
  start_time!: string | null;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format',
    nullable: true,
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:mm format',
  })
  end_time!: string | null;
}
