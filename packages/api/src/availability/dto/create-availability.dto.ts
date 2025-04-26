import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAvailabilityDto {
  @ApiProperty({
    description:
      'The unique identifier of the venue. Either venueId or spaceId must be provided.',
    type: String,
    required: false, // не обязательное поле, так как используется ValidateIf
  })
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.spaceId)
  venueId?: string;

  @ApiProperty({
    description:
      'The unique identifier of the space. Either spaceId or venueId must be provided.',
    type: String,
    required: false, // не обязательное поле, так как используется ValidateIf
  })
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.venueId)
  spaceId?: string;
}
