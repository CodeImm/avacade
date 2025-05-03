import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateAvailabilityRulesDto } from '../../rules/dto/create-availability-rules.dto';
import { Optional } from '@nestjs/common';

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

  @ApiProperty({
    description: 'Time zone of the venue in IANA format',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({
    description: 'Rules in JSON format',
    type: CreateAvailabilityRulesDto,
    example: {
      intervals: [
        {
          start_date: '2025-05-05T23:00:00Z',
          end_date: '2025-05-06T01:00:00Z',
        },
      ],
      recurrence_rule: {
        frequency: 'WEEKLY',
        interval: 1,
        until: null,
        byweekday: ['MO', 'TU'],
      },
    },
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateAvailabilityRulesDto)
  rules!: CreateAvailabilityRulesDto;
}
