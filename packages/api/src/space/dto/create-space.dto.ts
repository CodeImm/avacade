import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSpaceDto {
  @ApiProperty({
    description: 'Name of the space',
    example: 'Yoga Room 1',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'ID of the venue to which the space belongs',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  venueId!: string;

  @ApiPropertyOptional({
    description: 'Capacity of the space (optional)',
    example: 20,
    required: false,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Floor number where the space is located (optional)',
    example: 2,
    required: false,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  floor?: number;
}
