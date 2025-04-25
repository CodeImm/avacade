import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [OrganizationsModule, VenuesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
