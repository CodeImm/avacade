import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@repo/db';

export class UpdateSpaceDto implements Prisma.SpaceUpdateInput {
  @ApiPropertyOptional({
    description: 'Name of the space',
    example: 'Updated Yoga Room',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'ID of the associated venue',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  venueId?: string;

  @ApiPropertyOptional({
    description: 'Capacity of the space',
    example: 30,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Floor number where the space is located',
    example: 3,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  floor?: number;
}
