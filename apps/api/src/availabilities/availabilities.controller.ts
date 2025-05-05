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
  ApiTags,
} from '@nestjs/swagger';
import {
  Availability,
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from '@repo/api';
import { AvailabilitiesService, Interval } from './availabilities.service';

@ApiTags('availabilities')
@Controller('availabilities')
export class AvailabilitiesController {
  constructor(private readonly availabilitiesService: AvailabilitiesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Availability,
    description: 'Availability created successfully',
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
  async findIntervals(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('venueId') venueId?: string,
    @Query('spaceId') spaceId?: string,
  ): Promise<Interval[]> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    if (!venueId && !spaceId) {
      throw new BadRequestException(
        'Either venueId or spaceId must be provided',
      );
    }
    // TODO: обратить внимание на формат дат utc или что-то другое
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
  async findOne(@Param('id') id: string): Promise<Availability> {
    return this.availabilitiesService.findOne(id);
  }

  // @Get('/venues/:venueId/availability')
  // @ApiOkResponse({
  //   type: [Availability],
  //   description: 'Availability rules for a specific venue',
  // })
  // async findByVenue(
  //   @Param('venueId') venueId: string,
  // ): Promise<Availability[]> {
  //   return this.availabilitiesService.findByEntity({ venueId });
  // }

  // @Get('/spaces/:spaceId/availability')
  // @ApiOkResponse({
  //   type: [Availability],
  //   description: 'Availability rules for a specific space',
  // })
  // async findBySpace(
  //   @Param('spaceId') spaceId: string,
  // ): Promise<Availability[]> {
  //   return this.availabilitiesService.findByEntity({ spaceId });
  // }

  @Patch(':id')
  @ApiOkResponse({
    type: Availability,
    description: 'Availability updated successfully',
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
    @Query('date') date?: string,
  ): Promise<Availability | { success: boolean }> {
    if (date) {
      console.log({ date });
      return this.availabilitiesService.deleteAvailability(id, date);
    }
    return this.availabilitiesService.remove(id);
  }
}
