import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { VenuesModule } from './venues/venues.module';
import { SpacesModule } from './spaces/spaces.module';

@Module({
  imports: [OrganizationsModule, VenuesModule, SpacesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
