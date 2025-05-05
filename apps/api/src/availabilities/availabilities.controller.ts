import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  Availability,
  CreateAvailabilityDto,
  FindIntervalsQueryDto,
  Interval,
  IntervalDto,
  UpdateAvailabilityDto,
  DeleteAvailabilityQueryDto,
} from '@repo/api';
import { AvailabilitiesService } from './availabilities.service';

@ApiTags('availabilities')
@Controller('availabilities')
export class AvailabilitiesController {
  constructor(private readonly availabilitiesService: AvailabilitiesService) {}

  @Post()
  @ApiCreatedResponse({
    type: [Availability],
    description: 'Availability created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid availability data',
  })
  async create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability[]> {
    return this.availabilitiesService.create(createAvailabilityDto);
  }

  @Get()
  @ApiOkResponse({
    type: [Availability],
    description: 'List of all availability rules',
  })
  async findAll(): Promise<Availability[]> {
    return this.availabilitiesService.findAll();
  }

  @Get('/intervals')
  @ApiOkResponse({
    type: [IntervalDto],
    description: 'List of availability intervals for the specified date range',
  })
  @ApiBadRequestResponse({
    description:
      'Missing startDate/endDate or neither venueId nor spaceId provided',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date in YYYY-MM-DD format',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date in YYYY-MM-DD format',
  })
  @ApiQuery({
    name: 'venueId',
    required: false,
    description: 'UUID of the venue (optional if spaceId provided)',
  })
  @ApiQuery({
    name: 'spaceId',
    required: false,
    description: 'UUID of the space (optional if venueId provided)',
  })
  async findIntervals(
    @Query() query: FindIntervalsQueryDto,
  ): Promise<Interval[]> {
    const { startDate, endDate, venueId, spaceId } = query;

    if (!venueId && !spaceId) {
      throw new BadRequestException(
        'Either venueId or spaceId must be provided',
      );
    }

    return this.availabilitiesService.findIntervalsByDateRange(
      startDate,
      endDate,
      venueId,
      spaceId,
    );
  }

  @Get(':id')
  @ApiOkResponse({
    type: Availability,
    description: 'Details of a specific availability rule',
  })
  @ApiNotFoundResponse({
    description: 'Availability not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
  })
  async findOne(@Param('id') id: string): Promise<Availability> {
    return this.availabilitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    type: Availability,
    description: 'Availability updated successfully',
  })
  @ApiNotFoundResponse({
    description: 'Availability not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format or invalid update data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ): Promise<Availability> {
    return this.availabilitiesService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: Availability,
    description: 'Availability deleted successfully',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid date format or no interval found for the specified date',
  })
  @ApiNotFoundResponse({
    description: 'Availability not found',
  })
  async remove(
    @Param('id') id: string,
    @Query() query: DeleteAvailabilityQueryDto,
  ): Promise<Availability | Availability[]> {
    if (query.date) {
      return this.availabilitiesService.deleteAvailability(
        id,
        query.date,
      ) as any;
    }
    return this.availabilitiesService.remove(id);
  }
}
