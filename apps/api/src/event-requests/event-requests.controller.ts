import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EventRequestsService } from './event-requests.service';
import {
  CreateEventRequestDto,
  UpdateEventRequestDto,
  RejectEventRequestDto,
} from '@repo/api';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('event-requests')
@Controller('event-requests')
export class EventRequestsController {
  constructor(private readonly eventRequestsService: EventRequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new event request',
    description: 'Creates a new event request based on an event template',
  })
  @ApiResponse({
    status: 201,
    description: 'The event request has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() createEventRequestDto: CreateEventRequestDto) {
    return this.eventRequestsService.create(createEventRequestDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all event requests',
    description: 'Retrieves all event requests with optional filtering',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by request status',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter by date range start',
    type: Date,
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter by date range end',
    type: Date,
  })
  @ApiResponse({ status: 200, description: 'List of event requests.' })
  findAll(
    @Query('status') status?: string,
    @Query('from') from?: Date,
    @Query('to') to?: Date,
  ) {
    return this.eventRequestsService.findAll({ status, from, to });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific event request',
    description: 'Retrieves event request by ID',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({ status: 200, description: 'The event request.' })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  findOne(@Param('id') id: string) {
    return this.eventRequestsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an event request',
    description: 'Updates an existing event request',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({
    status: 200,
    description: 'The event request has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  update(
    @Param('id') id: string,
    @Body() updateEventRequestDto: UpdateEventRequestDto,
  ) {
    return this.eventRequestsService.update(id, updateEventRequestDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an event request',
    description: 'Removes an event request from the system',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({
    status: 200,
    description: 'The event request has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  remove(@Param('id') id: string) {
    return this.eventRequestsService.remove(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary: 'Confirm an event request',
    description: 'Confirms an event request and creates an event',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({
    status: 200,
    description: 'The event request has been confirmd and event created.',
  })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  confirm(@Param('id') id: string) {
    return this.eventRequestsService.confirm(id);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Reject an event request',
    description: 'Rejects an event request with optional comment',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({
    status: 200,
    description: 'The event request has been rejected.',
  })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  reject(@Param('id') id: string, @Body() data: RejectEventRequestDto) {
    return this.eventRequestsService.reject(id, data.comment);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an event request',
    description: 'Cancels an event request, changing its status to CANCELLED',
  })
  @ApiParam({ name: 'id', description: 'Event request ID' })
  @ApiResponse({
    status: 200,
    description: 'The event request has been successfully cancelled.',
  })
  @ApiResponse({ status: 404, description: 'Event request not found.' })
  cancel(@Param('id') id: string) {
    return this.eventRequestsService.cancel(id);
  }
}
