import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateAvailabilityDto, Availability } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilitiesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability> {
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

    return this.prisma.availability.create({
      data: createAvailabilityDto,
    });
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
}
