/*
  Warnings:

  - Added the required column `rules` to the `Availability` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "rules" JSONB NOT NULL;
