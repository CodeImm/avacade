import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEventTemplateDto,
  EventTemplate,
  UpdateEventTemplateDto,
} from '@repo/api';

@Injectable()
export class EventTemplatesService {
  constructor(private prisma: PrismaService) {}

  create(
    createEventTemplateDto: CreateEventTemplateDto,
  ): Promise<EventTemplate> {
    return this.prisma.eventTemplate.create({
      data: {
        title: createEventTemplateDto.title,
        duration: createEventTemplateDto.duration,
      },
    });
  }

  findAll(): Promise<EventTemplate[]> {
    return this.prisma.eventTemplate.findMany();
  }

  async findOne(id: string) {
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: { id },
    });

    if (!eventTemplate) {
      throw new NotFoundException(`EventTemplate with ID ${id} not found`);
    }

    return eventTemplate;
  }

  async update(
    id: string,
    updateEventTemplateDto: UpdateEventTemplateDto,
  ): Promise<EventTemplate> {
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: { id },
    });

    if (!eventTemplate) {
      throw new NotFoundException(`EventTemplate with ID ${id} not found`);
    }

    return this.prisma.eventTemplate.update({
      where: { id },
      data: updateEventTemplateDto,
    });
  }

  async remove(id: string): Promise<EventTemplate> {
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: { id },
    });

    if (!eventTemplate) {
      throw new NotFoundException(`EventTemplate with ID ${id} not found`);
    }

    return this.prisma.eventTemplate.delete({
      where: { id },
    });
  }
}
