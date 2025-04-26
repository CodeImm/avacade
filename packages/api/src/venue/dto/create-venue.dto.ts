import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  organizationId!: string;
}
