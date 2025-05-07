import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  Validate,
} from 'class-validator';
import { IsYYYYMMDDConstraint } from '../../common/validators/is-yyyy-mm-dd.validator';
import { StartDateBeforeEndDateConstraint } from '../../common/validators/start-date-before-end-date.validator';

export class FindIntervalsQueryDto {
  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-05-07',
  })
  @IsNotEmpty()
  @IsDateString()
  @Validate(IsYYYYMMDDConstraint)
  @Validate(StartDateBeforeEndDateConstraint)
  startDate!: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2025-05-10',
  })
  @IsNotEmpty()
  @IsDateString()
  @Validate(IsYYYYMMDDConstraint)
  endDate!: string;

  @ApiProperty({
    description: 'Type of entity (venue, space, or user)',
    enum: ['venue', 'space', 'user'],
    example: 'venue',
  })
  @IsEnum(['venue', 'space', 'user'], {
    message: 'entityType must be one of: venue, space, user',
  })
  entityType!: 'venue' | 'space' | 'user';

  @ApiProperty({
    description: 'UUID of the entity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('all', { message: 'entityId must be a valid UUID' })
  entityId!: string;
}
