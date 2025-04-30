import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

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
    description: 'Duration in minutes',
    example: 480,
  })
  @IsInt({ message: 'Duration must be an integer' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  duration_minutes!: number;

  @ApiProperty({
    description: 'Valid from date in YYYY-MM-DD format',
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
  valid_from!: string;
}
