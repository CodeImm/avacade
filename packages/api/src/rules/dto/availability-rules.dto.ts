import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ExceptionDto } from './exception.dto';
import { RecurrenceRuleDto } from './recurrence-rule.dto';
import { TimeIntervalDto } from './time-interval.dto';

export class AvailabilityRulesDto {
  @ApiProperty({
    description: 'Time intervals',
    type: [TimeIntervalDto],
    example: [
      {
        start_time: '09:00',
        end_time: '17:00',
        days_of_week: ['MO', 'TU'],
        valid_from: null,
        valid_until: null,
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TimeIntervalDto)
  intervals!: TimeIntervalDto[];

  @ApiPropertyOptional({
    description: 'Exceptions',
    type: [ExceptionDto],
    example: [
      {
        date: '2025-05-02',
        status: 'CLOSED',
        start_time: null,
        end_time: null,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExceptionDto)
  @IsOptional()
  exceptions?: ExceptionDto[];

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
  @Type(() => RecurrenceRuleDto)
  @IsOptional()
  recurrence_rule?: RecurrenceRuleDto;
}
