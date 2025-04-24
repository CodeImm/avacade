import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from '@repo/api/organization/dto/create-organization.dto';
import { UpdateOrganizationDto } from '@repo/api/organization/dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  create(createOrganizationDto: CreateOrganizationDto) {
    return 'This action adds a new organization';
  }

  findAll() {
    return `This action returns all organization`;
  }

  findOne(id: number) {
    return `This action returns a #${id} organization`;
  }

  update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    return `This action updates a #${id} organization`;
  }

  remove(id: number) {
    return `This action removes a #${id} organization`;
  }
}
