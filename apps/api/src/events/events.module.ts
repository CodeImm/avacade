import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AvailabilitiesService } from '../availabilities/availabilities.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, AvailabilitiesService],
})
export class EventsModule {}
