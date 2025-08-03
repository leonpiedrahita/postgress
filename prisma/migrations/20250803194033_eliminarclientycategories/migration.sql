/*
  Warnings:

  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" DROP DEFAULT;

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "products";
