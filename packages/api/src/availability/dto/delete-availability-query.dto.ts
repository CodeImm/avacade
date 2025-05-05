import { IsOptional, Validate } from 'class-validator';
import { IsYYYYMMDDConstraint } from '../../common/validators/is-yyyy-mm-dd.validator';

export class DeleteAvailabilityQueryDto {
  @IsOptional()
  @Validate(IsYYYYMMDDConstraint)
  date?: string;
}
