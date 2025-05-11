import { Module } from '@nestjs/common';
import { EventRequestsService } from './event-requests.service';
import { EventRequestsController } from './event-requests.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [EventRequestsController],
  providers: [EventRequestsService],
})
export class EventRequestsModule {}
