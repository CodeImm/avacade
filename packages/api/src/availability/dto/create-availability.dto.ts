import { Prisma } from '@repo/db';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CreateAvailabilityDto
  implements
    Omit<
      Prisma.AvailabilityCreateInput,
      'id' | 'venue' | 'space' | 'createdAt' | 'updatedAt'
    >
{
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.spaceId)
  venueId?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.venueId)
  spaceId?: string;
}
