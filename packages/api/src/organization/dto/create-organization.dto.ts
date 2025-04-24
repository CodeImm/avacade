import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@repo/db';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrganizationDto implements Prisma.OrganizationCreateInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  name!: string;
}
