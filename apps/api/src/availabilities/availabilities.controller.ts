import {
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
  DeleteAvailabilityQueryDto,
  FindIntervalsQueryDto,
  IntervalDto,
  UpdateAvailabilityDto,
} from '@repo/api';
import {
  AvailabilitiesService,
  AvailabilityEntityType,
} from './availabilities.service';

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
    description: 'Invalid date format or invalid entity parameters',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-05-07',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date in YYYY-MM-DD format',
    example: '2025-05-10',
  })
  @ApiQuery({
    name: 'entityType',
    required: true,
    description: 'Type of entity (venue, space, or user)',
    enum: AvailabilityEntityType,
  })
  @ApiQuery({
    name: 'entityId',
    required: true,
    description: 'UUID of the entity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async findIntervals(
    @Query() query: FindIntervalsQueryDto,
  ): Promise<IntervalDto[]> {
    const { startDate, endDate, entityType, entityId } = query;

    const entity = {
      type: AvailabilityEntityType[
        entityType.toUpperCase()
      ] as AvailabilityEntityType,
      id: entityId,
    };

    return this.availabilitiesService.getAvailabilityIntervalsForEntity(
      startDate,
      endDate,
      entity,
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
      return this.availabilitiesService.remove(id, query.date);
    }

    return this.availabilitiesService.remove(id);
  }
}
