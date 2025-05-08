import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEventTemplateDto {
  @ApiProperty({
    description: 'Title of the event template',
    example: 'Yoga with Anna',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Duration of the event template in minutes',
    example: 60,
    type: Number,
  })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiPropertyOptional({
    description: 'Price in whole units (e.g., rubles)',
    example: 1500,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Indicates whether the template is accessible to clients',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_client_accessible!: boolean;

  @ApiPropertyOptional({
    description:
      'If true, bookings created from this template will be auto-confirmed',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  auto_confirm?: boolean;
}
