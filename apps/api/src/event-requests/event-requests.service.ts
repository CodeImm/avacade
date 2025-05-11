import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventRequestDto, UpdateEventRequestDto } from '@repo/api';
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

  async create(createEventRequestDto: CreateEventRequestDto) {
    // Получение шаблона события для создания снапшота
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: { id: createEventRequestDto.event_template_id },
    });

    if (!eventTemplate) {
      throw new NotFoundException(
        `EventTemplate with ID ${createEventRequestDto.event_template_id} not found`,
      );
    }

    // Проверка, что шаблон активен и доступен для запроса клиентами
    if (!eventTemplate.is_active) {
      throw new Error('Event template is not active');
    }

    if (eventTemplate.accessibility === 'STAFF_ONLY') {
      throw new Error(
        'This event template is not available for client requests',
      );
    }

    // Создание запроса с снапшотом данных шаблона
    return this.prisma.eventRequest.create({
      data: {
        event_template_id: createEventRequestDto.event_template_id,
        preferred_time: createEventRequestDto.preferred_time,
        comment: createEventRequestDto.comment,

        // Снапшот данных шаблона
        title_snapshot: eventTemplate.title,
        description_snapshot: eventTemplate.description,
        duration_snapshot: eventTemplate.duration,
        price_snapshot: eventTemplate.price,

        // Для автоматического подтверждения шаблонов
        status: eventTemplate.auto_confirm ? 'APPROVED' : 'PENDING',
      },
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
