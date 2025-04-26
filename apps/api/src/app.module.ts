import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { VenuesModule } from './venues/venues.module';
import { SpacesModule } from './spaces/spaces.module';
import { AvailabilitiesModule } from './availabilities/availabilities.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    OrganizationsModule,
    VenuesModule,
    SpacesModule,
    AvailabilitiesModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
