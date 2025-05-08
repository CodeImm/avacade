import { PartialType } from '@nestjs/swagger';
import { CreateEventTemplateDto } from './create-event-template.dto';

export class UpdateEventTemplateDto extends PartialType(
  CreateEventTemplateDto,
) {}
