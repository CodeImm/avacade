import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import dayjs from '../configs/dayjs-config';

@ValidatorConstraint({ name: 'startDateBeforeEndDate', async: false })
export class StartDateBeforeEndDateConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string, args: ValidationArguments): boolean {
    const { end_date } = args.object as { end_date: string };
    if (!value || !end_date) {
      return true; // Let IsNotEmpty handle empty values
    }

    const start = dayjs(value, 'YYYY-MM-DD', true);
    const end = dayjs(end_date, 'YYYY-MM-DD', true);
    return start.isValid() && end.isValid() && start.isSameOrBefore(end, 'day');
  }

  defaultMessage(): string {
    return 'start_date must be before or equal to end_date';
  }
}
