import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AvailabilityRulesDto } from '../../rules/dto/availability-rules.dto';

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
    description: 'Rules in JSON format',
    type: AvailabilityRulesDto,
    example: {
      intervals: [
        {
          start_time: '09:00',
          end_time: '17:00',
          days_of_week: ['MO', 'TU'],
          valid_from: null,
          valid_until: null,
        },
      ],
      exceptions: [
        {
          date: '2025-05-02',
          status: 'CLOSED',
          start_time: null,
          end_time: null,
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
  @Type(() => AvailabilityRulesDto)
  rules!: AvailabilityRulesDto;
}
