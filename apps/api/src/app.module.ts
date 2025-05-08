import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { VenuesModule } from './venues/venues.module';
import { SpacesModule } from './spaces/spaces.module';
import { AvailabilitiesModule } from './availabilities/availabilities.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { DayjsModule } from './dayjs/dayjs.module';
import { EventTemplatesModule } from './event-templates/event-templates.module';

@Module({
  imports: [
    OrganizationsModule,
    VenuesModule,
    SpacesModule,
    AvailabilitiesModule,
    PrismaModule,
    EventsModule,
    DayjsModule,
    EventTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
