/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `spaceId` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `venueId` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `spaceId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `accessibility` on the `EventTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `auto_confirm` on the `EventTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `venueId` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Venue` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Venue` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `space_id` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Added the required column `venue_id` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `Venue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Venue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_venueId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_venueId_fkey";

-- DropForeignKey
ALTER TABLE "Venue" DROP CONSTRAINT "Venue_organizationId_fkey";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "createdAt",
DROP COLUMN "spaceId",
DROP COLUMN "updatedAt",
DROP COLUMN "venueId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "space_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "venue_id" TEXT;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "createdAt",
DROP COLUMN "spaceId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "event_request_id" TEXT,
ADD COLUMN     "price" INTEGER,
ADD COLUMN     "space_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "EventTemplate" DROP COLUMN "accessibility",
DROP COLUMN "auto_confirm",
ADD COLUMN     "space_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "venueId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "venue_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Venue" DROP COLUMN "createdAt",
DROP COLUMN "organizationId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_event_request_id_fkey" FOREIGN KEY ("event_request_id") REFERENCES "EventRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
