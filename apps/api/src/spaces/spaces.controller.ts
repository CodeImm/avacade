import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto, UpdateSpaceDto, Space } from '@repo/api';

@ApiTags('spaces')
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Space,
    description: 'Space created successfully',
  })
  @ApiConflictResponse({
    description: 'Space with this name already exists in this venue',
  })
  async create(@Body() createSpaceDto: CreateSpaceDto): Promise<Space> {
    return this.spacesService.create(createSpaceDto);
  }

  @Get()
  @ApiOkResponse({ type: [Space], description: 'List of all spaces' })
  async findAll(): Promise<Space[]> {
    return this.spacesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: Space, description: 'Details of a specific space' })
  async findOne(@Param('id') id: string): Promise<Space> {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Space, description: 'Space updated successfully' })
  @ApiConflictResponse({
    description: 'Space with this name already exists in this venue',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
  ): Promise<Space> {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Space, description: 'Space deleted successfully' })
  async remove(@Param('id') id: string): Promise<Space> {
    return this.spacesService.remove(id);
  }
}
