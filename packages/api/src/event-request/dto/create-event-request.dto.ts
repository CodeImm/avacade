import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventRequestDto {
  @ApiProperty({
    description: 'ID of the event template',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  event_template_id!: string;

  @ApiProperty({
    description: 'Preferred date and time for the event',
    type: String,
    format: 'date-time',
    example: '2025-06-01T14:00:00Z',
  })
  @IsDateString()
  preferred_time!: string;

  @ApiPropertyOptional({
    description: 'Optional comment provided by the user',
    type: String,
    example: 'Prefer a morning slot',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
