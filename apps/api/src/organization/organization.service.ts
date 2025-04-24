import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  Organization,
} from '@repo/api';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.prisma.organization.create({
      data: createOrganizationDto,
    });
  }

  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany();
  }

  async findOne(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto,
    });
  }

  async remove(id: string): Promise<Organization> {
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
