import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
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

  @ApiProperty({
    description: 'IDs of spaces where this template is valid',
    example: ['space1', 'space2'],
    type: [String],
    default: [],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  space_ids!: string[];

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

  @ApiPropertyOptional({
    description: 'Detailed description of the event template',
    example: 'This yoga session focuses on breathing and flexibility.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Indicates whether the template is active',
    example: true,
    default: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
