import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Validate,
} from 'class-validator';
import { IsYYYYMMDDConstraint } from '../../common/validators/is-yyyy-mm-dd.validator';
import { StartDateBeforeEndDateConstraint } from '../../common/validators/start-date-before-end-date.validator';

export class FindIntervalsQueryDto {
  @IsNotEmpty()
  @IsDateString()
  @Validate(IsYYYYMMDDConstraint)
  @Validate(StartDateBeforeEndDateConstraint)
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  @Validate(IsYYYYMMDDConstraint)
  endDate!: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}
