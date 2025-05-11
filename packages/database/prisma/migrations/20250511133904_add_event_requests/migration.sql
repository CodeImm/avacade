/*
  Warnings:

  - You are about to drop the column `is_client_accessible` on the `EventTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventTemplate" DROP COLUMN "is_client_accessible",
ADD COLUMN     "accessibility" TEXT NOT NULL DEFAULT 'STAFF_ONLY',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EventRequest" (
    "id" TEXT NOT NULL,
    "event_template_id" TEXT NOT NULL,
    "preferred_time" TIMESTAMP(3),
    "title_snapshot" TEXT NOT NULL,
    "duration_snapshot" INTEGER NOT NULL,
    "price_snapshot" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "response_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_event_template_id_fkey" FOREIGN KEY ("event_template_id") REFERENCES "EventTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
