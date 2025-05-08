import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EventTemplatesService } from './event-templates.service';
import { CreateEventTemplateDto, UpdateEventTemplateDto } from '@repo/api';

@Controller('event-templates')
export class EventTemplatesController {
  constructor(private readonly eventTemplatesService: EventTemplatesService) {}

  @Post()
  create(@Body() createEventTemplateDto: CreateEventTemplateDto) {
    return this.eventTemplatesService.create(createEventTemplateDto);
  }

  @Get()
  findAll() {
    return this.eventTemplatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventTemplatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventTemplateDto: UpdateEventTemplateDto,
  ) {
    return this.eventTemplatesService.update(id, updateEventTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventTemplatesService.remove(id);
  }
}
