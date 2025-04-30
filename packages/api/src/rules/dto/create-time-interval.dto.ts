import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStartDateBeforeEndDate', async: false })
export class IsStartDateBeforeEndDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as any).start_date;

    if (!startDate || !endDate) {
      return true;
    } // Let IsNotEmpty handle empty cases

    return new Date(startDate) <= new Date(endDate);
  }

  defaultMessage(args: ValidationArguments) {
    return 'start_date must not be later than end_date';
  }
}

export class CreateTimeIntervalDto {
  @ApiProperty({
    description: 'Start date and time in ISO 8601 format (UTC)',
    example: '2025-05-05T23:00:00Z',
  })
  @IsISO8601({}, { message: 'start_date must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'start_date must not be empty' })
  start_date!: string;

  @ApiProperty({
    description: 'End date and time in ISO 8601 format (UTC)',
    example: '2025-05-06T01:00:00Z',
  })
  @IsISO8601({}, { message: 'end_date must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'end_date must not be empty' })
  @Validate(IsStartDateBeforeEndDateConstraint)
  end_date!: string;
}
