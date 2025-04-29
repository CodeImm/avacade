import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EventStatus } from '../types';

@ValidatorConstraint({ name: 'TimeOrder', async: false })
class TimeOrderConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments) {
    const { startTime, endTime } = args.object as CreateEventDto;
    return new Date(startTime) < new Date(endTime);
  }

  defaultMessage() {
    return 'startTime must be before endTime';
  }
}

export class CreateEventDto {
  @ApiProperty({
    description:
      'Identifier of the space where the event takes place (UUID, optional)',
    example: '223e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  @IsUUID()
  spaceId!: string;

  @ApiProperty({
    description: 'Title of the event',
    example: 'Yoga with Anna',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Start time of the event (ISO 8601 format)',
    example: '2025-05-01T09:00:00Z',
    type: String,
  })
  @IsDateString({
    strict: true,
  })
  @Validate(TimeOrderConstraint)
  startTime!: string;

  @ApiProperty({
    description: 'End time of the event (ISO 8601 format)',
    example: '2025-05-01T10:00:00Z',
    type: String,
  })
  @IsDateString({
    strict: true,
  })
  endTime!: string;

  @ApiProperty({
    description: 'Status of the event',
    enum: EventStatus,
    example: EventStatus.PLANNED,
    default: EventStatus.PLANNED,
  })
  @IsEnum(EventStatus)
  status!: EventStatus;
}
