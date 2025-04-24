import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@repo/db';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto
  implements Omit<Prisma.OrganizationUpdateInput, 'id'>
{
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  name?: string;
}
