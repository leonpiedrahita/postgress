-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "refreshTokenExp" TIMESTAMP(3);
