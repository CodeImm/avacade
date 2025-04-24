import { IsString, IsOptional } from 'class-validator';
import { Prisma } from '@repo/db';

export class UpdateOrganizationDto implements Prisma.OrganizationUpdateInput {
  @IsString()
  @IsOptional()
  name?: string;
}
