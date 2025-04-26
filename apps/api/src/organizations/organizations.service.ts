import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  Organization,
} from '@repo/api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    const existing = await this.prisma.organization.findFirst({
      where: { name: createOrganizationDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Organization with name ${createOrganizationDto.name} already exists`,
      );
    }

    return this.prisma.organization.create({
      data: createOrganizationDto,
    });
  }

  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany();
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto,
    });
  }

  async remove(id: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.prisma.organization.delete({
      where: { id },
    });
  }
}
