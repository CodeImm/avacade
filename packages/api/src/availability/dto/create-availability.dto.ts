import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateAvailabilityRulesDto } from '../../rules/dto/create-availability-rules.dto';

@ValidatorConstraint({ name: 'OnlyOneIdProvided', async: false })
class OnlyOneIdProvidedConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    return !!(obj.venueId && !obj.spaceId) || !!(obj.spaceId && !obj.venueId);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Either venueId or spaceId must be provided, but not both.';
  }
}

export class CreateAvailabilityDto {
  @ApiPropertyOptional({
    description:
      'The unique identifier of the venue. Either venueId or spaceId must be provided.',
    type: String,
  })
  @IsString()
  @IsOptional()
  @Validate(OnlyOneIdProvidedConstraint)
  venueId?: string;

  @ApiPropertyOptional({
    description:
      'The unique identifier of the space. Either spaceId or venueId must be provided.',
    type: String,
  })
  @IsString()
  @IsOptional()
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
