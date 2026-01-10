/*
  Warnings:

  - You are about to drop the `ReferralClick` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReferralClick" DROP CONSTRAINT "ReferralClick_agentId_fkey";

-- DropTable
DROP TABLE "ReferralClick";
