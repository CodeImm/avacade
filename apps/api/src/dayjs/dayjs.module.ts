import { Module, Global } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('UTC');

@Global()
@Module({
  providers: [
    {
      provide: 'DAYJS',
      useValue: dayjs,
    },
  ],
  exports: ['DAYJS'],
})
export class DayjsModule {}
