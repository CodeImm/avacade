import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ExceptionStatus } from '../types';

export class ExceptionDto {
  @ApiProperty({
    description: 'Exception date in YYYY-MM-DD format',
    example: '2025-05-02',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Status of the exception',
    enum: ExceptionStatus,
    example: 'CLOSED',
  })
  @IsEnum(ExceptionStatus)
  status!: ExceptionStatus;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    nullable: true,
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  start_time!: string | null;

  @ApiProperty({
    description: 'End time in HH:mm format',
    nullable: true,
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  end_time!: string | null;
}
