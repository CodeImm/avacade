import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto, Interval, UpdateEventDto } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilitiesService } from '../availabilities/availabilities.service';
import { Dayjs } from 'dayjs';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private availabilitiesService: AvailabilitiesService,
    @Inject('DAYJS') private readonly dayjs: typeof import('dayjs'),
  ) {}

  async create(createEventDto: CreateEventDto) {
    const { spaceId, timezone, interval } = createEventDto;

    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new BadRequestException('Invalid spaceId');
    }

    const eventStart = this.dayjs.utc(interval.start_date);
    const eventEnd = this.dayjs.utc(interval.end_date);

    if (!eventStart.isValid() || !eventEnd.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    if (eventEnd.isBefore(eventStart)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Получение и обработка интервалов доступности
    const availabilityIntervals = await this.getAvailabilityIntervals(
      spaceId,
      eventStart,
      eventEnd,
    );
    if (!availabilityIntervals.length) {
      throw new BadRequestException(
        'Event does not fall within any availability interval',
      );
    }

    // Объединение последовательных интервалов
    const mergedIntervals = this.mergeSequentialIntervals(
      availabilityIntervals,
    );

    // Проверка попадания события в интервал доступности
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

    // Проверка пересечений с существующими событиями
    const hasConflictingEvents = await this.checkConflictingEvents(
      spaceId,
      eventStart,
      eventEnd,
      timezone,
    );
    if (hasConflictingEvents) {
      throw new BadRequestException('Event conflicts with existing events');
    }

    // Форматирование интервала события
    const startLocal = eventStart.tz(timezone);
    const endLocal = eventEnd.tz(timezone);
    const eventInterval = {
      start_time: startLocal.format('HH:mm'),
      end_time: endLocal.format('HH:mm'),
      duration_minutes: endLocal.diff(startLocal, 'minute'),
      valid_from: startLocal.format('YYYY-MM-DDTHH:mm:ss'),
    };

    // Создание события
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        interval: eventInterval,
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

  async getAvailabilityIntervals(
    spaceId: string,
    start: Dayjs,
    end: Dayjs,
  ): Promise<Interval[]> {
    const availabilities = await this.prisma.availability.findMany({
      where: { spaceId },
    });
    return availabilities
      .map((a) =>
        this.availabilitiesService.generateAvailabilityIntervals(
          a,
          start.toISOString(),
          end.toISOString(),
        ),
      )
      .flat();
  }

  private mergeSequentialIntervals(intervals: Interval[]): Interval[] {
    if (!intervals.length) return [];
    if (intervals.length === 1) return [intervals[0]!];

    const sortedIntervals = intervals.sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );
    const merged: Interval[] = [];
    let current = { ...sortedIntervals[0] } as Interval;

    for (let i = 1; i < sortedIntervals.length; i++) {
      const next = sortedIntervals[i]!;
      const currentEnd = this.dayjs(current.end_date);
      const nextStart = this.dayjs(next.start_date);

      if (currentEnd.isSameOrAfter(nextStart)) {
        current.end_date = this.dayjs
          .max(currentEnd, this.dayjs(next.end_date))
          .toISOString();
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  async checkConflictingEvents(
    spaceId: string,
    eventStart: Dayjs,
    eventEnd: Dayjs,
    timezone: string,
  ): Promise<boolean> {
    const existingEvents = await this.prisma.event.findMany({
      where: { spaceId },
    });
    const conflictingIntervals = existingEvents
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
        const intervalStart = interval.start_date;
        const intervalEnd = interval.end_date;
        return !(
          intervalEnd.isSameOrBefore(eventStart) ||
          intervalStart.isSameOrAfter(eventEnd)
        );
      });
    return conflictingIntervals.length > 0;
  }
}
