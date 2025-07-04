-- Add RestockRecord table for tracking product restocking
CREATE TABLE IF NOT EXISTS "RestockRecord" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestockRecord_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "RestockRecord" ADD CONSTRAINT "RestockRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockRecord" ADD CONSTRAINT "RestockRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestockRecord" ADD CONSTRAINT "RestockRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "RestockRecord_productId_idx" ON "RestockRecord"("productId");
CREATE INDEX IF NOT EXISTS "RestockRecord_companyId_idx" ON "RestockRecord"("companyId");
CREATE INDEX IF NOT EXISTS "RestockRecord_userId_idx" ON "RestockRecord"("userId");
CREATE INDEX IF NOT EXISTS "RestockRecord_createdAt_idx" ON "RestockRecord"("createdAt");

-- Update existing products to ensure they have proper minStock values
UPDATE "Product" SET "minStock" = 10 WHERE "minStock" IS NULL OR "minStock" = 0;

-- Create stock alerts for existing products that are below minimum stock
INSERT INTO "StockAlert" ("id", "productId", "companyId", "alertType", "message", "isResolved", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    p."id",
    p."companyId",
    CASE 
        WHEN p."quantity" = 0 THEN 'CRITICAL'
        WHEN p."quantity" <= 5 THEN 'HIGH'
        ELSE 'MEDIUM'
    END,
    CASE 
        WHEN p."quantity" = 0 THEN p."name" || ' is out of stock!'
        WHEN p."quantity" <= 5 THEN p."name" || ' is running low (' || p."quantity" || ' remaining)'
        ELSE p."name" || ' is below minimum stock level (' || p."quantity" || ' remaining)'
    END,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."quantity" <= p."minStock" 
AND p."isActive" = true
AND NOT EXISTS (
    SELECT 1 FROM "StockAlert" sa 
    WHERE sa."productId" = p."id" 
    AND sa."isResolved" = false
);
