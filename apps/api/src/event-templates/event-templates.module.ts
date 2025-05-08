import { Module } from '@nestjs/common';
import { EventTemplatesService } from './event-templates.service';
import { EventTemplatesController } from './event-templates.controller';

@Module({
  controllers: [EventTemplatesController],
  providers: [EventTemplatesService],
})
export class EventTemplatesModule {}
