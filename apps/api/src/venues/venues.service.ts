import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVenueDto, Space, UpdateVenueDto, Venue } from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: createVenueDto.organization_id },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createVenueDto.organization_id} not found`,
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
      where: { venue_id: venueId },
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

    if (updateVenueDto.organization_id) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: updateVenueDto.organization_id },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${updateVenueDto.organization_id} not found`,
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
