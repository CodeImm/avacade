import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import dayjs from '../configs/dayjs-config';

@ValidatorConstraint({ name: 'isYYYYMMDD', async: false })
export class IsYYYYMMDDConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) {
      return false;
    }

    return dayjs(value, 'YYYY-MM-DD', true).isValid();
  }

  defaultMessage(): string {
    return 'Date must be in YYYY-MM-DD format';
  }
}
