-- Add UserInventory table to track user's inventory from approved orders
CREATE TABLE IF NOT EXISTS "UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "UserInventory_userId_productId_key" ON "UserInventory"("userId", "productId");

-- Add foreign key constraints
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "UserInventory_userId_idx" ON "UserInventory"("userId");
CREATE INDEX IF NOT EXISTS "UserInventory_productId_idx" ON "UserInventory"("productId");
CREATE INDEX IF NOT EXISTS "UserInventory_quantityAvailable_idx" ON "UserInventory"("quantityAvailable");

-- Populate UserInventory for existing approved orders
INSERT INTO "UserInventory" ("id", "userId", "productId", "quantityReceived", "quantityUsed", "quantityAvailable", "createdAt", "lastUpdated")
SELECT 
    CONCAT('ui_', gen_random_uuid()::text) as id,
    o."userId",
    oi."productId",
    SUM(oi."quantity") as quantityReceived,
    0 as quantityUsed,
    SUM(oi."quantity") as quantityAvailable,
    NOW() as createdAt,
    NOW() as lastUpdated
FROM "OrderRequest" o
JOIN "OrderRequestItem" oi ON o."id" = oi."orderRequestId"
WHERE o."status" IN ('APPROVED', 'FULFILLED', 'SHIPPED')
GROUP BY o."userId", oi."productId"
ON CONFLICT ("userId", "productId") DO UPDATE SET
    "quantityReceived" = EXCLUDED."quantityReceived",
    "quantityAvailable" = EXCLUDED."quantityAvailable",
    "lastUpdated" = NOW();

-- Update UserInventory to account for products already given as credit
UPDATE "UserInventory" 
SET 
    "quantityUsed" = subquery.used_quantity,
    "quantityAvailable" = "quantityReceived" - subquery.used_quantity,
    "lastUpdated" = NOW()
FROM (
    SELECT 
        c."userId",
        co."productId",
        SUM(co."quantity") as used_quantity
    FROM "CustomerOrder" co
    JOIN "Customer" c ON co."customerId" = c."id"
    GROUP BY c."userId", co."productId"
) as subquery
WHERE "UserInventory"."userId" = subquery."userId" 
AND "UserInventory"."productId" = subquery."productId";

-- Ensure no negative quantities
UPDATE "UserInventory" 
SET "quantityAvailable" = 0 
WHERE "quantityAvailable" < 0;

COMMIT;
