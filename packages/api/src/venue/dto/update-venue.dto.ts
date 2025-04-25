import { IsString, IsOptional } from 'class-validator';
import type { Prisma } from '@repo/db';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto implements Prisma.VenueUpdateInput {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  organizationId?: string;
}
