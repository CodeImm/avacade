import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DayOfWeek, RecurrenceFrequency } from '../types';

@ValidatorConstraint({ name: 'UniqueArray', async: false })
class UniqueArray implements ValidatorConstraintInterface {
  validate(values: any[] | null) {
    if (!values) return true;
    const unique = new Set(values);
    return unique.size === values.length;
  }
  defaultMessage() {
    return 'Array must contain unique values';
  }
}

@ValidatorConstraint({ name: 'NoZeroInArray', async: false })
class NoZeroInArray implements ValidatorConstraintInterface {
  validate(values: number[] | null) {
    return Array.isArray(values) ? values.every((value) => value !== 0) : true;
  }
  defaultMessage() {
    return 'Array cannot contain 0';
  }
}

@ValidatorConstraint({ name: 'CountOrUntil', async: false })
class CountOrUntil implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments) {
    const { count, until } = args.object as RecurrenceRuleDto;
    return !(count !== null && until !== null);
  }
  defaultMessage() {
    return 'Only one of count or until can be specified';
  }
}

@ValidatorConstraint({ name: 'UntilAfterDtstart', async: false })
class UntilAfterDtstart implements ValidatorConstraintInterface {
  validate(until: string | null, args: ValidationArguments) {
    if (!until) return true;
    const { dtstart } = args.object as RecurrenceRuleDto;
    return new Date(until) >= new Date(dtstart);
  }
  defaultMessage() {
    return 'until must be on or after dtstart';
  }
}

@ValidatorConstraint({ name: 'ValidBymonthday', async: false })
class ValidBymonthday implements ValidatorConstraintInterface {
  validate(bymonthday: number[] | null, args: ValidationArguments) {
    const { frequency } = args.object as RecurrenceRuleDto;
    if (
      bymonthday?.length &&
      (frequency === RecurrenceFrequency.DAILY ||
        frequency === RecurrenceFrequency.WEEKLY)
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'bymonthday cannot be used with DAILY or WEEKLY frequency';
  }
}

@ValidatorConstraint({ name: 'ValidBysetpos', async: false })
class ValidBysetpos implements ValidatorConstraintInterface {
  validate(bysetpos: number[] | null, args: ValidationArguments) {
    const { frequency } = args.object as RecurrenceRuleDto;
    if (
      bysetpos?.length &&
      (frequency === RecurrenceFrequency.DAILY ||
        frequency === RecurrenceFrequency.WEEKLY)
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'bysetpos cannot be used with DAILY or WEEKLY frequency';
  }
}

@ValidatorConstraint({ name: 'WeeklyByweekday', async: false })
class WeeklyByweekday implements ValidatorConstraintInterface {
  validate(byweekday: DayOfWeek[] | null, args: ValidationArguments) {
    const { frequency } = args.object as RecurrenceRuleDto;
    if (
      frequency === RecurrenceFrequency.WEEKLY &&
      (!byweekday || byweekday.length === 0)
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'byweekday must be specified and non-empty for WEEKLY frequency';
  }
}

@ValidatorConstraint({ name: 'MonthlyByweekdayBysetpos', async: false })
class MonthlyByweekdayBysetpos implements ValidatorConstraintInterface {
  validate(byweekday: DayOfWeek[] | null, args: ValidationArguments) {
    const { frequency, bysetpos } = args.object as RecurrenceRuleDto;
    if (
      frequency === RecurrenceFrequency.MONTHLY &&
      byweekday?.length &&
      (!bysetpos || bysetpos.length === 0)
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'byweekday requires bysetpos for MONTHLY frequency';
  }
}

@ValidatorConstraint({
  name: 'MonthlyBysetposRequiresByweekdayOrBymonthday',
  async: false,
})
class MonthlyBysetposRequiresByweekdayOrBymonthday
  implements ValidatorConstraintInterface
{
  validate(bysetpos: number[] | null, args: ValidationArguments) {
    const { frequency, byweekday, bymonthday } =
      args.object as RecurrenceRuleDto;
    if (
      frequency === RecurrenceFrequency.MONTHLY &&
      bysetpos?.length &&
      !byweekday?.length &&
      !bymonthday?.length
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'bysetpos requires at least one of byweekday or bymonthday for MONTHLY frequency';
  }
}

@ValidatorConstraint({ name: 'NoByweekdayForDaily', async: false })
class NoByweekdayForDaily implements ValidatorConstraintInterface {
  validate(byweekday: DayOfWeek[] | null, args: ValidationArguments) {
    const { frequency } = args.object as RecurrenceRuleDto;
    if (frequency === RecurrenceFrequency.DAILY && byweekday?.length) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'byweekday cannot be used with DAILY frequency';
  }
}

@ValidatorConstraint({
  name: 'NoByweekdayWithBymonthdayForMonthly',
  async: false,
})
class NoByweekdayWithBymonthdayForMonthly
  implements ValidatorConstraintInterface
{
  validate(bymonthday: number[] | null, args: ValidationArguments) {
    const { frequency, byweekday } = args.object as RecurrenceRuleDto;
    if (
      frequency === RecurrenceFrequency.MONTHLY &&
      bymonthday?.length &&
      byweekday?.length
    ) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'byweekday and bymonthday cannot be used together for MONTHLY frequency';
  }
}

export class RecurrenceRuleDto {
  @ApiProperty({
    description: 'Recurrence frequency (DAILY, WEEKLY, MONTHLY)',
    enum: RecurrenceFrequency,
    example: RecurrenceFrequency.WEEKLY,
  })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @ApiProperty({
    description: 'Recurrence start date in YYYY-MM-DD format',
    example: '2025-01-06',
  })
  @IsDateString({ strict: true })
  dtstart!: string;

  @ApiPropertyOptional({
    description: 'The interval between each frequency iteration. Must be >= 1',
    example: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({
    description: 'Recurrence end date in YYYY-MM-DD format',
    example: '2025-12-31',
    nullable: true,
  })
  @IsDateString({ strict: true })
  @Validate(UntilAfterDtstart)
  @IsOptional()
  until?: string | null;

  @ApiPropertyOptional({
    description: 'Number of occurrences (alternative to until)',
    example: 10,
    nullable: true,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @Validate(CountOrUntil)
  @IsOptional()
  count?: number | null;

  @ApiPropertyOptional({
    description: 'Days of the week for recurrence (e.g., MO, TU)',
    enum: DayOfWeek,
    isArray: true,
    nullable: true,
    example: [DayOfWeek.MO, DayOfWeek.TU],
  })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @Validate(UniqueArray)
  @Validate(WeeklyByweekday)
  @Validate(NoByweekdayForDaily)
  @Validate(MonthlyByweekdayBysetpos)
  @IsOptional()
  byweekday?: DayOfWeek[] | null;

  @ApiPropertyOptional({
    description: 'Days of the month for recurrence (1 to 31 or -31 to -1)',
    type: [Number],
    nullable: true,
    example: [1, 15, -1],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(-31, { each: true })
  @Max(31, { each: true })
  @Validate(UniqueArray)
  @Validate(NoZeroInArray)
  @Validate(ValidBymonthday)
  @Validate(NoByweekdayWithBymonthdayForMonthly)
  @IsOptional()
  bymonthday?: number[] | null;

  @ApiPropertyOptional({
    description:
      'Specifies the n-th occurrence(s) to apply the rule (-31 to -1 or 1 to 31)',
    type: [Number],
    nullable: true,
    example: [1, -1],
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(-31, { each: true })
  @Max(31, { each: true })
  @Validate(NoZeroInArray)
  @Validate(UniqueArray)
  @Validate(ValidBysetpos)
  @Validate(MonthlyBysetposRequiresByweekdayOrBymonthday)
  @IsOptional()
  bysetpos?: number[] | null;
}
