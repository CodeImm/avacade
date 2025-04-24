import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateOrganizationDto,
  Organization,
  UpdateOrganizationDto,
} from '@repo/api';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiBody({ type: CreateOrganizationDto })
  @ApiCreatedResponse({
    description: 'The record has been successfully created.',
    type: Organization,
  })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOkResponse({
    description: 'Get all organizations.',
    type: [Organization],
  })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Get organization by ID.',
    type: Organization,
  })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiOkResponse({
    description: 'The record has been successfully updated.',
    type: Organization,
  })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiNoContentResponse({
    description: 'The record has been successfully deleted.',
  })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
