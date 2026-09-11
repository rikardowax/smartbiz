-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
