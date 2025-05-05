import { Module, Global } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import minMax from 'dayjs/plugin/minMax';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('UTC');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
