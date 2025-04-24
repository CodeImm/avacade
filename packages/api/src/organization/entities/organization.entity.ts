import { ApiProperty } from '@nestjs/swagger';
import type { Organization as PrismaOrganization } from '@repo/db';

export class Organization implements PrismaOrganization {
  @ApiProperty({
    description: 'Unique identifier of the organization (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'Клиника Здоровье',
  })
  name!: string;
}
