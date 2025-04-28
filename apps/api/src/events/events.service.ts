import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto, UpdateEventDto } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    if (createEventDto.spaceId) {
      const space = await this.prisma.space.findUnique({
        where: { id: createEventDto.spaceId },
      });

      if (!space) {
        throw new BadRequestException('Invalid spaceId');
      }
    }

    const event = await this.prisma.event.create({
      data: {
        spaceId: createEventDto.spaceId,
        title: createEventDto.title,
        startTime: new Date(createEventDto.startTime),
        endTime: new Date(createEventDto.endTime),
        status: createEventDto.status,
      },
      include: { space: true },
    });

    return {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async findAll() {
    const events = await this.prisma.event.findMany({
      include: { space: true },
    });

    return events.map((event) => ({
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { space: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (updateEventDto.spaceId) {
      const space = await this.prisma.space.findUnique({
        where: { id: updateEventDto.spaceId },
      });
      if (!space) {
        throw new BadRequestException('Invalid spaceId');
      }
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        spaceId: updateEventDto.spaceId,
        title: updateEventDto.title,
        startTime: updateEventDto.startTime
          ? new Date(updateEventDto.startTime)
          : undefined,
        endTime: updateEventDto.endTime
          ? new Date(updateEventDto.endTime)
          : undefined,
        status: updateEventDto.status,
      },
      include: { space: true },
    });

    return {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  async remove(id: string) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: `Event with ID ${id} successfully deleted` };
  }
}
