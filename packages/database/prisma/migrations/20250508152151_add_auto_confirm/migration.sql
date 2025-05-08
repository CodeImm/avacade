-- AlterTable
ALTER TABLE "EventTemplate" ADD COLUMN     "auto_confirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_client_accessible" BOOLEAN NOT NULL DEFAULT false;
