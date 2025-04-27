## 1. изменения packages\typescript-config\nestjs.json по сравнению с официаотным примером https://github.com/notiz-dev/nestjs-prisma-starter/tree/main/src

+    "target": "ES2023",
+    "declaration": true,

-    "moduleResolution": "Node10",


## 2.

turborepo + nestjs. если добавить "preserveSymlinks": true то UpdateVenueDto определяется как {} если "preserveSymlinks": true не использовать то UpdateVenueDto определяется правильно как class UpdateVenueDto { 
    name: string | undefined;
    organizationId: string | undefined;
}, но есть ошибка  The inferred type of UpdateVenueDto cannot be named without a reference to .pnpm/@nestjs+common@11.0.21_class-transformer@0.5.1_class-validator@0.14.1_reflect-metadata@0.2.2_rxjs@7.8.2/node_modules/@nestjs/common . This is likely not portable. A type annotation is necessary.

packages\api\src\venue\dto\update-venue.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto';

export class UpdateVenueDto extends PartialType(CreateVenueDto) {}
The inferred type of 'UpdateVenueDto' cannot be named without a reference to '.pnpm/@nestjs+common@11.0.21_class-transformer@0.5.1_class-validator@0.14.1_reflect-metadata@0.2.2_rxjs@7.8.2/node_modules/@nestjs/common'. This is likely not portable. A type annotation is necessary.

packages\api\
помогло добавление    "preserveSymlinks": true и установка @nestjs/common

объясни почему и как это работает

https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189