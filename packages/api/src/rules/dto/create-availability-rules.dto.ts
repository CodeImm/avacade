import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateTimeIntervalDto } from './create-time-interval.dto';
import { RecurrenceRuleDto } from './recurrence-rule.dto';
import { CreateRecurrenceRuleDto } from './create-recurrence-rule.dto';

@ValidatorConstraint({ name: 'nonOverlappingIntervals', async: false })
export class NonOverlappingIntervalsConstraint
  implements ValidatorConstraintInterface
{
  validate(intervals: CreateTimeIntervalDto[], args: ValidationArguments) {
    if (!intervals || intervals.length <= 1) {
      return true; // Нет интервалов или только один — пересечений быть не может
    }

    // Проверяем каждую пару интервалов
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const intervalA = intervals[i];
        const intervalB = intervals[j];

        // Пропускаем, если даты отсутствуют (валидируется другими правилами)
        if (
          !intervalA!.start_date ||
          !intervalA!.end_date ||
          !intervalB!.start_date ||
          !intervalB!.end_date
        ) {
          continue;
        }

        const startA = new Date(intervalA!.start_date);
        const endA = new Date(intervalA!.end_date);
        const startB = new Date(intervalB!.start_date);
        const endB = new Date(intervalB!.end_date);

        // Проверка пересечения: startA < endB && startB < endA
        if (startA < endB && startB < endA) {
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Intervals must not overlap with each other';
  }
}

export class CreateAvailabilityRulesDto {
  @ApiProperty({
    description: 'Time intervals',
    type: [CreateTimeIntervalDto],
    example: [
      {
        start_date: '2025-05-05T23:00:00Z',
        end_date: '2025-05-06T01:00:00Z',
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTimeIntervalDto)
  @Validate(NonOverlappingIntervalsConstraint)
  intervals!: CreateTimeIntervalDto[];

  @ApiPropertyOptional({
    description: 'Recurrence rule',
    type: RecurrenceRuleDto,
    example: {
      frequency: 'WEEKLY',
      interval: 1,
      until: null,
      byweekday: ['MO', 'TU'],
    },
  })
  @ValidateNested()
  @Type(() => CreateRecurrenceRuleDto)
  @IsOptional()
  recurrence_rule?: CreateRecurrenceRuleDto;
}
