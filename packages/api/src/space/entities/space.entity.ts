import { ApiProperty } from '@nestjs/swagger';
import type { Space as PrismaSpace } from '@repo/db';

export class Space implements PrismaSpace {
  @ApiProperty({
    description: 'Unique identifier of the space (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the space',
    example: 'Conference Room A',
  })
  name!: string;

  @ApiProperty({
    description: 'ID of the associated venue',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  venue_id!: string;

  @ApiProperty({
    description: 'Capacity of the space',
    type: Number,
    nullable: true,
    example: 50,
  })
  capacity!: number | null;

  @ApiProperty({
    description: 'Floor number (if applicable)',
    type: Number,
    nullable: true,
    example: 2,
  })
  floor!: number | null;

  @ApiProperty({
    description: 'Creation time of the space',
    type: String,
    format: 'date-time',
    example: '2025-04-25T12:00:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Last update time of the space',
    type: String,
    format: 'date-time',
    example: '2025-04-25T15:00:00Z',
  })
  updated_at!: Date;
}
