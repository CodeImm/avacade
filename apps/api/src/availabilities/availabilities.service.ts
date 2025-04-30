import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Availability, CreateAvailabilityDto, DayOfWeek } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';

interface TimeIntervalGroup {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  intervals: CreateAvailabilityDto['rules']['intervals'];
  daysOfWeek: DayOfWeek[];
  valid_from: string;
}

@Injectable()
export class AvailabilitiesService {
  constructor(
    private prisma: PrismaService,
    @Inject('DAYJS') private readonly dayjs: typeof import('dayjs'),
  ) {}

  async create(
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability[]> {
    const entityIds = [
      createAvailabilityDto.venueId,
      createAvailabilityDto.spaceId,
    ].filter(Boolean);

    if (entityIds.length !== 1) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }

    if (createAvailabilityDto.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: createAvailabilityDto.venueId },
      });

      if (!venue)
        throw new NotFoundException(
          `Venue with ID ${createAvailabilityDto.venueId} not found`,
        );
    }

    if (createAvailabilityDto.spaceId) {
      const space = await this.prisma.space.findUnique({
        where: { id: createAvailabilityDto.spaceId },
      });

      if (!space)
        throw new NotFoundException(
          `Space with ID ${createAvailabilityDto.spaceId} not found`,
        );
    }

    const intervalGroups = this.groupIntervals(
      createAvailabilityDto.rules.intervals,
    );

    const availabilityPromises = intervalGroups.map((group) => {
      // Формируем данные для создания записи availability
      const availabilityData = {
        ...createAvailabilityDto, // Копируем все поля из DTO (например, userId, venueId, spaceId)
        rules: {
          intervals: [
            {
              start_time: group.start_time,
              end_time: group.end_time,
              duration_minutes: group.duration_minutes,
              valid_from: group.valid_from,
            },
          ],
          ...(createAvailabilityDto.rules.recurrence_rule && {
            recurrence_rule: {
              ...createAvailabilityDto.rules.recurrence_rule,
              dtstart: group.valid_from,
              byweekday: group.daysOfWeek,
            },
          }),
        },
      };

      // Создаём запись в таблице availability
      return this.prisma.availability.create({
        data: availabilityData,
      });
    });

    // Выполняем все создания в транзакции
    return this.prisma.$transaction(availabilityPromises);
  }

  async findAll(): Promise<Availability[]> {
    return this.prisma.availability.findMany();
  }

  async findOne(id: string): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return availability;
  }

  // async findByEntity({
  //   venueId,
  //   spaceId,
  // }: {
  //   venueId?: string;
  //   spaceId?: string;
  // }): Promise<Availability[]> {
  //   const entityIds = [venueId, spaceId].filter(Boolean);

  //   if (entityIds.length !== 1) {
  //     throw new BadRequestException(
  //       'Exactly one of venueId or spaceId must be provided',
  //     );
  //   }

  //   return this.prisma.availability.findMany({
  //     where: { venueId, spaceId },
  //   });
  // }

  async update(
    id: string,
    updateAvailabilityDto: Partial<CreateAvailabilityDto>,
  ): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return this.prisma.availability.update({
      where: { id },
      data: updateAvailabilityDto,
    });
  }

  async remove(id: string): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return this.prisma.availability.delete({ where: { id } });
  }

  // Шаг 1: Группировка по start_time, end_time и duration
  private groupIntervals(
    intervals: CreateAvailabilityDto['rules']['intervals'],
  ) {
    const grouped: { [key in string]: TimeIntervalGroup } = {};

    const dayOfWeekMap: Record<number, DayOfWeek> = {
      0: DayOfWeek.SU,
      1: DayOfWeek.MO,
      2: DayOfWeek.TU,
      3: DayOfWeek.WE,
      4: DayOfWeek.TH,
      5: DayOfWeek.FR,
      6: DayOfWeek.SA,
    };

    intervals.forEach((interval) => {
      // Преобразуем даты в UTC и игнорируем секунды
      const start = this.dayjs.utc(interval.start_date).startOf('minute');
      const end = this.dayjs.utc(interval.end_date).startOf('minute');

      // Извлекаем время в формате HH:mm
      const startTime = start.format('HH:mm');
      const endTime = end.format('HH:mm');

      // Вычисляем продолжительность в минутах
      const duration = end.diff(start, 'minute');

      // Определяем день недели для start_date (0 = воскресенье, 1 = понедельник, ..., 6 = суббота)
      const weekday = start.day();

      const rruleWeekday = dayOfWeekMap[weekday] as DayOfWeek;

      // Ключ для группировки: startTime_endTime_duration
      const key = `${startTime}_${endTime}_${duration}`;

      if (!grouped[key]) {
        grouped[key] = {
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          intervals: [],
          daysOfWeek: [],
          valid_from: start.toISOString(),
        };
      }

      grouped[key].intervals.push(interval);
      grouped[key].daysOfWeek.push(rruleWeekday);

      // Обновляем valid_from, если текущая start_date раньше
      const currentValidFrom = this.dayjs.utc(grouped[key].valid_from);
      if (start.isBefore(currentValidFrom)) {
        grouped[key].valid_from = start.toISOString();
      }
    });

    // Преобразуем объект в массив
    return Object.values(grouped);
  }
}
