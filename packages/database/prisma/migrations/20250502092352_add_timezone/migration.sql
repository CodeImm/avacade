/*
  Warnings:

  - Added the required column `timezone` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Made the column `spaceId` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `timezone` to the `Venue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_spaceId_fkey";

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "timezone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "timezone" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
