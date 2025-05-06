import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto, Interval, UpdateEventDto } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilitiesService } from '../availabilities/availabilities.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private availabilitiesService: AvailabilitiesService,
    @Inject('DAYJS') private readonly dayjs: typeof import('dayjs'),
  ) {}

  async create(createEventDto: CreateEventDto) {
    const { timezone } = createEventDto;

    const space = await this.prisma.space.findUnique({
      where: { id: createEventDto.spaceId },
    });

    if (!space) {
      throw new BadRequestException('Invalid spaceId');
    }

    const startDate = this.dayjs.utc(createEventDto.interval.start_date);
    const endDate = this.dayjs.utc(createEventDto.interval.end_date);

    if (!startDate.isValid() || !endDate.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    if (endDate.isBefore(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Получение всех Availability для spaceId
    const availabilities = await this.prisma.availability.findMany({
      where: { spaceId: createEventDto.spaceId },
    });
    console.log({ availabilities, startDate, endDate });
    // Генерация интервалов для каждого Availability
    const availabilityIntervals = availabilities
      .map((a) =>
        this.availabilitiesService.generateAvailabilityIntervals(
          a,
          startDate.toISOString(),
          endDate.toISOString(),
        ),
      )
      .flat();

    console.log({ availabilityIntervals });

    if (availabilityIntervals.length === 0) {
      throw new BadRequestException(
        'Event does not fall within any availability interval',
      );
    }

    // Объединение последовательных интервалов
    const mergedIntervals: Interval[] = [];
    availabilityIntervals.sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );

    let currentInterval = availabilityIntervals[0];

    for (let i = 1; i < availabilityIntervals.length; i++) {
      const nextInterval = availabilityIntervals[i];
      const currentEnd = this.dayjs(currentInterval!.end_date);
      const nextStart = this.dayjs(nextInterval!.start_date);

      if (currentEnd.isSameOrAfter(nextStart)) {
        currentInterval!.end_date = this.dayjs
          .max(currentEnd, this.dayjs(nextInterval!.end_date))
          .toISOString();
      } else {
        mergedIntervals.push(currentInterval!);
        currentInterval = nextInterval;
      }
    }

    if (currentInterval) {
      mergedIntervals.push(currentInterval);
    }

    // Проверка, попадает ли событие в интервал доступности
    const eventStart = startDate;
    const eventEnd = endDate;
    const isWithinAvailability = mergedIntervals.some((interval) => {
      const intervalStart = this.dayjs(interval.start_date);
      const intervalEnd = this.dayjs(interval.end_date);
      return (
        eventStart.isSameOrAfter(intervalStart) &&
        eventEnd.isSameOrBefore(intervalEnd)
      );
    });

    if (!isWithinAvailability) {
      throw new BadRequestException(
        'Event does not fall within any availability interval',
      );
    }

    // Получение всех событий и генерация их интервалов
    const existingEvents = await this.prisma.event.findMany({
      where: { spaceId: createEventDto.spaceId },
    });
    console.log({ existingEvents });
    const eventIntervals = existingEvents
      .map((event) => ({
        start_date: this.dayjs
          .tz(
            `${this.dayjs(event.interval.valid_from).format('YYYY-MM-DD')}T${event.interval.start_time}`,
            timezone,
          )
          .utc(),
        end_date: this.dayjs
          .tz(
            `${this.dayjs(event.interval.valid_from).format('YYYY-MM-DD')}T${event.interval.start_time}`,
            timezone,
          )
          .add(event.interval.duration_minutes, 'minutes')
          .utc(),
      }))
      .filter((interval) => {
        const eventIntervalStart = interval.start_date;
        const eventIntervalEnd = interval.end_date;
        return !(
          eventIntervalEnd.isBefore(eventStart) ||
          eventIntervalStart.isAfter(eventEnd)
        );
      });

    // Проверка на отсутствие пересекающихся событий
    if (eventIntervals.length > 0) {
      throw new BadRequestException('Event conflicts with existing events');
    }

    const start = this.dayjs.utc(startDate).tz(timezone);
    const end = this.dayjs.utc(endDate).tz(timezone);

    const start_time = start.format('HH:mm');
    const end_time = end.format('HH:mm');
    const duration_minutes = end.diff(start, 'minute');
    const valid_from = start.format('YYYY-MM-DDTHH:mm:ss');

    // Создание события
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        interval: {
          start_time,
          end_time,
          duration_minutes,
          valid_from,
        },
      },
      include: { space: true },
    });
  }

  async findAll() {
    return await this.prisma.event.findMany({
      include: { space: true },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { space: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return existingEvent;
  }

  async remove(id: string) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return await this.prisma.event.delete({
      where: { id },
    });
  }
}
