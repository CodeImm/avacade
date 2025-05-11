import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateEventRequestDto,
  EventRequestStatus,
  EventStatus,
  UpdateEventRequestDto,
} from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

interface FindAllParams {
  status?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class EventRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Creates a new event request, and if auto_confirm is true, creates an Event and Booking.
   * @param createEventRequestDto - DTO containing event request details
   * @returns Created event request (and associated event/booking if auto_confirm)
   */
  async create(createEventRequestDto: CreateEventRequestDto) {
    // Fetch the event template to create snapshots and validate
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: { id: createEventRequestDto.event_template_id },
    });

    if (!eventTemplate) {
      throw new NotFoundException(
        `EventTemplate with ID ${createEventRequestDto.event_template_id} not found`,
      );
    }

    // Check if the template is active
    if (!eventTemplate.is_active) {
      throw new ForbiddenException('Event template is not active');
    }

    // Check if the template is accessible for client requests
    if (eventTemplate.accessibility === 'STAFF_ONLY') {
      throw new ForbiddenException(
        'This event template is not available for client requests',
      );
    }

    // Prepare common event request data
    const eventRequestData = {
      event_template_id: createEventRequestDto.event_template_id,
      preferred_time: createEventRequestDto.preferred_time,
      comment: createEventRequestDto.comment,
      title_snapshot: eventTemplate.title,
      description_snapshot: eventTemplate.description,
      duration_snapshot: eventTemplate.duration,
      price_snapshot: eventTemplate.price,
      status: eventTemplate.auto_confirm
        ? EventRequestStatus.CONFIRMED
        : EventRequestStatus.PENDING,
    };

    // If auto_confirm is true, create Event and Booking in a transaction
    if (eventTemplate.auto_confirm) {
      return this.prisma.$transaction(async (tx) => {
        // Create the event request
        const eventRequest = await tx.eventRequest.create({
          data: eventRequestData,
        });

        // Calculate start and end times for the event
        const startTime = new Date(createEventRequestDto.preferred_time);
        const endTime = new Date(
          startTime.getTime() + eventTemplate.duration * 60 * 1000,
        );

        const eventData = {
          event_request_id: eventRequest.id,
          title: eventTemplate.title,
          description: eventTemplate.description,
          timezone: '',
          interval: {},
          status: EventStatus.CONFIRMED,
          price: eventTemplate.price,
          space_id: 'null',
        };

        // Create the event
        const event = await tx.event.create({
          data: eventData,
        });

        //TODO: Create the booking

        return { eventRequest, event };
      });
    }

    // If auto_confirm is false, create only the event request
    return this.prisma.eventRequest.create({
      data: eventRequestData,
    });
  }

  async findAll(params: FindAllParams = {}) {
    const { status, from, to } = params;

    const where = {};

    if (status) {
      where['status'] = status;
    }

    if (from || to) {
      where['preferred_time'] = {};

      if (from) {
        where['preferred_time']['gte'] = from;
      }

      if (to) {
        where['preferred_time']['lte'] = to;
      }
    }

    return this.prisma.eventRequest.findMany({
      where,
      include: {
        EventTemplate: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const eventRequest = await this.prisma.eventRequest.findUnique({
      where: { id },
      include: {
        EventTemplate: true,
      },
    });

    if (!eventRequest) {
      throw new NotFoundException(`EventRequest with ID ${id} not found`);
    }

    return eventRequest;
  }

  async update(id: string, updateEventRequestDto: UpdateEventRequestDto) {
    // Проверяем существование запроса
    await this.findOne(id);

    // Обновляем только разрешенные поля
    // Обратите внимание: мы не обновляем поля снапшота, так как они должны сохранять
    // состояние шаблона на момент создания запроса
    return this.prisma.eventRequest.update({
      where: { id },
      data: {
        preferred_time: updateEventRequestDto.preferred_time,
        comment: updateEventRequestDto.comment,
      },
    });
  }

  async remove(id: string) {
    // Проверяем существование запроса
    await this.findOne(id);

    return this.prisma.eventRequest.delete({
      where: { id },
    });
  }

  async approve(id: string) {
    const eventRequest = await this.findOne(id);

    if (eventRequest.status !== 'PENDING') {
      throw new Error(
        `Cannot approve event request with status ${eventRequest.status}`,
      );
    }

    // Создаем новое событие на основе запроса
    // const event = await this.eventsService.createFromRequest(eventRequest);

    // Обновляем статус запроса и добавляем ссылку на созданное событие
    return this.prisma.eventRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        // Здесь можно добавить поле для связи с созданным событием,
        // например, created_event_id: event.id
      },
    });
  }

  async reject(id: string, comment: string) {
    const eventRequest = await this.findOne(id);

    if (eventRequest.status !== 'PENDING') {
      throw new Error(
        `Cannot reject event request with status ${eventRequest.status}`,
      );
    }

    return this.prisma.eventRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        response_comment: comment,
      },
    });
  }
}
