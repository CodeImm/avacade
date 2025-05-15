import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RejectEventRequestDto {
  @ApiPropertyOptional({
    description: 'Optional comment explaining the reason for rejection',
    example: 'The requested time slot is not available',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
