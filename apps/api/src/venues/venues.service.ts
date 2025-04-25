import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVenueDto, Space, UpdateVenueDto, Venue } from '@repo/api';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: createVenueDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createVenueDto.organizationId} not found`,
      );
    }

    const existingVenue = await this.prisma.venue.findFirst({
      where: { name: createVenueDto.name },
    });

    if (existingVenue) {
      throw new ConflictException(
        `Venue with name ${createVenueDto.name} already exists`,
      );
    }

    return this.prisma.venue.create({
      data: createVenueDto,
    });
  }

  async findAll(): Promise<Venue[]> {
    return this.prisma.venue.findMany();
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  async findSpacesByVenue(venueId: string): Promise<Space[]> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    return this.prisma.space.findMany({
      where: { venueId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    if (updateVenueDto.organizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: updateVenueDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${updateVenueDto.organizationId} not found`,
        );
      }
    }

    return this.prisma.venue.update({
      where: { id },
      data: updateVenueDto,
    });
  }

  async remove(id: string): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return this.prisma.venue.delete({
      where: { id },
    });
  }
}
