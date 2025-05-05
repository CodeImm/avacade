import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, Validate } from 'class-validator';
import { IsYYYYMMDDConstraint } from '../../common/validators/is-yyyy-mm-dd.validator';
import { StartDateBeforeEndDateConstraint } from '../../common/validators/start-date-before-end-date.validator';

export interface Interval {
  start_date: string; // Date in YYYY-MM-DD format (e.g., 2025-05-01)
  end_date: string; // Date in YYYY-MM-DD format (e.g., 2025-05-01)
  availability_id?: string | null;
  venueId?: string | null;
  spaceId?: string | null;
}

export class IntervalDto implements Interval {
  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-05-01',
  })
  @IsNotEmpty()
  @Validate(IsYYYYMMDDConstraint)
  @Validate(StartDateBeforeEndDateConstraint)
  start_date!: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2025-05-01',
  })
  @IsNotEmpty()
  @Validate(IsYYYYMMDDConstraint)
  end_date!: string;

  @ApiProperty({
    description: 'UUID of the availability',
    example: '91cef8c7-64fb-4558-968e-fc64733feb9b',
  })
  @IsNotEmpty()
  @IsUUID()
  availability_id!: string;

  @ApiProperty({
    description: 'UUID of the venue (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @ApiProperty({
    description: 'UUID of the space (optional)',
    example: '223e4567-e89b-12d3-a456-426614174001',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  spaceId?: string | null;
}
