import { Prisma } from '@repo/db';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrganizationDto implements Prisma.OrganizationCreateInput {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
