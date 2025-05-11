import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto, UpdateSpaceDto, Space } from '@repo/api';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) {}

  async create(createSpaceDto: CreateSpaceDto): Promise<Space> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: createSpaceDto.venue_id },
    });

    if (!venue) {
      throw new NotFoundException(
        `Venue with ID ${createSpaceDto.venue_id} not found`,
      );
    }

    const existingSpace = await this.prisma.space.findFirst({
      where: {
        name: createSpaceDto.name,
        venue_id: createSpaceDto.venue_id,
      },
    });

    if (existingSpace) {
      throw new ConflictException(
        `Space with name ${createSpaceDto.name} already exists in this venue`,
      );
    }

    return this.prisma.space.create({
      data: createSpaceDto,
    });
  }

  async findAll(): Promise<Space[]> {
    return this.prisma.space.findMany();
  }

  async findOne(id: string): Promise<Space> {
    const space = await this.prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    return space;
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto): Promise<Space> {
    const space = await this.prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    if (updateSpaceDto.venue_id) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: updateSpaceDto.venue_id },
      });

      if (!venue) {
        throw new NotFoundException(
          `Venue with ID ${updateSpaceDto.venue_id} not found`,
        );
      }
    }

    if (updateSpaceDto.name && updateSpaceDto.venue_id) {
      const existingSpace = await this.prisma.space.findFirst({
        where: {
          name: updateSpaceDto.name,
          venue_id: updateSpaceDto.venue_id,
          id: { not: id },
        },
      });

      if (existingSpace) {
        throw new ConflictException(
          `Space with name ${updateSpaceDto.name} already exists in this venue`,
        );
      }
    }

    return this.prisma.space.update({
      where: { id },
      data: updateSpaceDto,
    });
  }

  async remove(id: string): Promise<Space> {
    const space = await this.prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    return this.prisma.space.delete({
      where: { id },
    });
  }
}
