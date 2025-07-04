-- Fix User Inventory Script
-- This script recalculates all user inventory based on shipped orders

-- First, clear any existing inventory records that might be incorrect
DELETE FROM "UserInventory";

-- Create inventory records from shipped orders
INSERT INTO "UserInventory" (
  "id", 
  "userId", 
  "productId", 
  "quantityReceived", 
  "quantityUsed", 
  "quantityAvailable", 
  "lastUpdated", 
  "createdAt", 
  "updatedAt"
)
SELECT 
  gen_random_uuid() as id,
  o."userId",
  i."productId",
  SUM(i."quantity") as "quantityReceived",
  0 as "quantityUsed",
  SUM(i."quantity") as "quantityAvailable",
  NOW() as "lastUpdated",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "OrderRequest" o
JOIN "OrderRequestItem" i ON o."id" = i."orderRequestId"
WHERE o."status" = 'SHIPPED'
GROUP BY o."userId", i."productId"
ON CONFLICT ("userId", "productId") DO UPDATE
SET 
  "quantityReceived" = "UserInventory"."quantityReceived" + EXCLUDED."quantityReceived",
  "quantityAvailable" = "UserInventory"."quantityAvailable" + EXCLUDED."quantityReceived",
  "lastUpdated" = NOW(),
  "updatedAt" = NOW();

-- Adjust for customer orders (credit sales)
UPDATE "UserInventory" ui
SET 
  "quantityUsed" = COALESCE(co.total_used, 0),
  "quantityAvailable" = ui."quantityReceived" - COALESCE(co.total_used, 0),
  "lastUpdated" = NOW(),
  "updatedAt" = NOW()
FROM (
  SELECT 
    c."userId",
    co."productId",
    SUM(co."quantity") as total_used
  FROM "CustomerOrder" co
  JOIN "Customer" c ON co."customerId" = c."id"
  GROUP BY c."userId", co."productId"
) co
WHERE ui."userId" = co."userId" AND ui."productId" = co."productId";

-- Output summary of inventory
SELECT 
  u."name" as "userName",
  p."name" as "productName",
  ui."quantityReceived",
  ui."quantityUsed",
  ui."quantityAvailable"
FROM "UserInventory" ui
JOIN "User" u ON ui."userId" = u."id"
JOIN "Product" p ON ui."productId" = p."id"
ORDER BY u."name", p."name";
