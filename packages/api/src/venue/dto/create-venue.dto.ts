import { IsString, IsNotEmpty } from 'class-validator';
import type { Prisma } from '@repo/db';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVenueDto
  implements Omit<Prisma.VenueCreateInput, 'organization' | 'id'>
{
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  organizationId!: string;
}
