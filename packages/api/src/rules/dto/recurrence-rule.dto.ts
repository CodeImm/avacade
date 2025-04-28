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

@ValidatorConstraint({ name: 'NoZeroInBysetpos', async: false })
class NoZeroInBysetpos implements ValidatorConstraintInterface {
  validate(values: number[], _args: ValidationArguments) {
    return Array.isArray(values) ? values.every((value) => value !== 0) : true;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'bysetpos cannot contain 0 (must be between -366 and -1, or between 1 and 366)';
  }
}

@ValidatorConstraint({ name: 'UniqueByweekday', async: false })
class UniqueByweekday implements ValidatorConstraintInterface {
  validate(byweekday: DayOfWeek[] | null) {
    if (!byweekday) return true;
    const unique = new Set(byweekday);
    return unique.size === byweekday.length;
  }
  defaultMessage() {
    return 'byweekday must contain unique days';
  }
}

@ValidatorConstraint({ name: 'UniqueBymonthday', async: false })
class UniqueBymonthday implements ValidatorConstraintInterface {
  validate(bymonthday: number[] | null) {
    if (!bymonthday) return true;
    const unique = new Set(bymonthday);
    return unique.size === bymonthday.length;
  }
  defaultMessage() {
    return 'bymonthday must contain unique values';
  }
}

@ValidatorConstraint({ name: 'UniqueBysetpos', async: false })
class UniqueBysetpos implements ValidatorConstraintInterface {
  validate(bysetpos: number[] | null) {
    if (!bysetpos) return true;
    const unique = new Set(bysetpos);
    return unique.size === bysetpos.length;
  }
  defaultMessage() {
    return 'bysetpos must contain unique values';
  }
}

@ValidatorConstraint({ name: 'UniqueByhour', async: false })
class UniqueByhour implements ValidatorConstraintInterface {
  validate(byhour: number[] | null) {
    if (!byhour) return true;
    const unique = new Set(byhour);
    return unique.size === byhour.length;
  }
  defaultMessage() {
    return 'byhour must contain unique values';
  }
}

@ValidatorConstraint({ name: 'ValidBymonthday', async: false })
class ValidBymonthday implements ValidatorConstraintInterface {
  validate(bymonthday: number[] | null, args: ValidationArguments) {
    const { frequency } = args.object as RecurrenceRuleDto;
    if (frequency === RecurrenceFrequency.DAILY && bymonthday?.length) {
      return false;
    }
    return true;
  }
  defaultMessage() {
    return 'bymonthday cannot be used with DAILY frequency';
  }
}

export class RecurrenceRuleDto {
  @ApiProperty({
    description: 'Recurrence frequency (DAILY, WEEKLY, MONTHLY, YEARLY)',
    enum: RecurrenceFrequency,
    example: 'WEEKLY',
  })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'The interval between each frequency iteration. Must be >= 1',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({
    description: 'Recurrence end date in YYYY-MM-DD format',
    nullable: true,
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  until?: string | null;

  @ApiPropertyOptional({
    description: 'Number of occurrences (alternative to until)',
    nullable: true,
    example: 10,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  count?: number | null;

  @ApiPropertyOptional({
    description: 'Days of the week for recurrence (e.g., MO, TU)',
    enum: DayOfWeek,
    isArray: true,
    nullable: true,
    example: ['MO', 'TU'],
  })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @Validate(UniqueByweekday)
  @IsOptional()
  byweekday?: DayOfWeek[] | null;

  @ApiPropertyOptional({
    description: 'Days of the month for recurrence (1 to 31)',
    type: [Number],
    nullable: true,
    example: [1, 15],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(-31, { each: true })
  @Max(31, { each: true })
  @Validate(UniqueBymonthday)
  @Validate(ValidBymonthday)
  @IsOptional()
  bymonthday?: number[] | null;

  @ApiPropertyOptional({
    description:
      'Specifies the n-th occurrence(s) to apply the rule. Can be single integer or array of integers (-366..-1 or 1..366)',
    type: [Number],
    nullable: true,
    example: [1, -1],
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true, message: 'Each bysetpos must be an integer' })
  @Min(-366, { each: true, message: 'Each bysetpos must be >= -366' })
  @Max(366, { each: true, message: 'Each bysetpos must be <= 366' })
  @Validate(NoZeroInBysetpos)
  @Validate(UniqueBysetpos)
  @IsOptional()
  bysetpos?: number[] | null;

  @ApiPropertyOptional({
    description: 'Hours of the day for recurrence (0 to 23)',
    type: [Number],
    nullable: true,
    example: [9, 14],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  @Validate(UniqueByhour)
  @IsOptional()
  byhour?: number[] | null;
}
