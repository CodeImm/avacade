import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto, Space, UpdateVenueDto, Venue } from '@repo/api';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Venue,
    description: 'Venue created successfully',
  })
  async create(@Body() createVenueDto: CreateVenueDto): Promise<Venue> {
    return this.venuesService.create(createVenueDto);
  }

  @Get()
  @ApiOkResponse({ type: [Venue], description: 'List of all venues' })
  async findAll(): Promise<Venue[]> {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    type: Venue,
    description: 'Details of a specific venue',
  })
  async findOne(@Param('id') id: string): Promise<Venue> {
    return this.venuesService.findOne(id);
  }

  @Get(':id/spaces')
  @ApiOkResponse({
    type: [Space],
    description: 'List of spaces for a specific venue',
  })
  async findSpacesByVenue(@Param('id') id: string): Promise<Space[]> {
    return this.venuesService.findSpacesByVenue(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    type: Venue,
    description: 'Venue updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateVenueDto: UpdateVenueDto,
  ): Promise<Venue> {
    return this.venuesService.update(id, updateVenueDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: Venue,
    description: 'Venue deleted successfully',
  })
  async remove(@Param('id') id: string): Promise<Venue> {
    return this.venuesService.remove(id);
  }
}
