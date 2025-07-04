-- Add new stock management fields to Product table
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "minStockLevel" INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS "maxStockLevel" INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS "reorderPoint" INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS "reorderQuantity" INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS "lastStockUpdate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "stockStatus" TEXT DEFAULT 'IN_STOCK';

-- Update existing products to use stockQuantity from quantity
UPDATE "Product" SET "stockQuantity" = "quantity" WHERE "stockQuantity" = 0;
UPDATE "Product" SET "minStockLevel" = "minStock" WHERE "minStockLevel" = 10;

-- Enhance StockAlert table
ALTER TABLE "StockAlert" 
ADD COLUMN IF NOT EXISTS "currentStock" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "thresholdValue" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- Update alertType values to new format
UPDATE "StockAlert" SET "alertType" = 'LOW_STOCK' WHERE "alertType" = 'MEDIUM';
UPDATE "StockAlert" SET "alertType" = 'OUT_OF_STOCK' WHERE "alertType" = 'CRITICAL';

-- Create StockMovement table
CREATE TABLE IF NOT EXISTS "StockMovement" (
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

-- Add foreign key constraints for StockMovement
ALTER TABLE "StockMovement" 
ADD CONSTRAINT "StockMovement_productId_fkey" 
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" 
ADD CONSTRAINT "StockMovement_createdBy_fkey" 
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "StockAlert_productId_isResolved_idx" ON "StockAlert"("productId", "isResolved");
CREATE INDEX IF NOT EXISTS "StockAlert_companyId_isResolved_idx" ON "StockAlert"("companyId", "isResolved");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- Create initial stock movements for existing products (optional)
INSERT INTO "StockMovement" ("id", "productId", "movementType", "quantity", "previousStock", "newStock", "referenceType", "notes", "createdAt")
SELECT 
    'initial_' || "id",
    "id",
    'ADJUSTMENT',
    "stockQuantity",
    0,
    "stockQuantity",
    'INITIAL',
    'Initial stock setup during migration',
    "createdAt"
FROM "Product" 
WHERE "stockQuantity" > 0
ON CONFLICT ("id") DO NOTHING;

-- Update stock status based on current levels
UPDATE "Product" 
SET "stockStatus" = CASE 
    WHEN "stockQuantity" = 0 THEN 'OUT_OF_STOCK'
    WHEN "stockQuantity" <= "minStockLevel" THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
END;

-- Create stock alerts for products that need them
INSERT INTO "StockAlert" ("id", "productId", "companyId", "alertType", "message", "currentStock", "thresholdValue", "createdAt")
SELECT 
    'alert_' || p."id",
    p."id",
    p."companyId",
    CASE 
        WHEN p."stockQuantity" = 0 THEN 'OUT_OF_STOCK'
        WHEN p."stockQuantity" <= p."minStockLevel" THEN 'LOW_STOCK'
    END,
    CASE 
        WHEN p."stockQuantity" = 0 THEN 'Product is out of stock'
        WHEN p."stockQuantity" <= p."minStockLevel" THEN 'Product stock is below minimum level'
    END,
    p."stockQuantity",
    p."minStockLevel",
    NOW()
FROM "Product" p
WHERE p."stockQuantity" <= p."minStockLevel"
  AND NOT EXISTS (
    SELECT 1 FROM "StockAlert" sa 
    WHERE sa."productId" = p."id" 
    AND sa."isResolved" = false
  );

-- Update lastStockUpdate for all products
UPDATE "Product" SET "lastStockUpdate" = "updatedAt";

COMMIT;
