/*
  Warnings:

  - Added the required column `currentStock` to the `StockAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thresholdValue` to the `StockAlert` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lastStockUpdate" TIMESTAMP(3),
ADD COLUMN     "maxStockLevel" INTEGER DEFAULT 1000,
ADD COLUMN     "minStockLevel" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "reorderPoint" INTEGER DEFAULT 20,
ADD COLUMN     "reorderQuantity" INTEGER DEFAULT 100,
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockStatus" TEXT NOT NULL DEFAULT 'IN_STOCK';

-- AlterTable
ALTER TABLE "StockAlert" ADD COLUMN     "currentStock" INTEGER NOT NULL,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "thresholdValue" INTEGER NOT NULL,
ALTER COLUMN "message" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "StockAlert_productId_isResolved_idx" ON "StockAlert"("productId", "isResolved");

-- CreateIndex
CREATE INDEX "StockAlert_companyId_isResolved_idx" ON "StockAlert"("companyId", "isResolved");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
