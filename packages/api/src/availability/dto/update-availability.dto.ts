import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@repo/db';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAvailabilityDto implements Prisma.AvailabilityUpdateInput {
  @ApiProperty({
    description: 'ID of the associated venue',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.spaceId)
  venueId?: string;

  @ApiProperty({
    description: 'ID of the associated space',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.venueId)
  spaceId?: string;
}
