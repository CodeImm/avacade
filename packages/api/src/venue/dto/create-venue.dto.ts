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
  organization_id!: string;

  @ApiProperty({
    description: 'Time zone of the venue in IANA format',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  timezone!: string;
}
