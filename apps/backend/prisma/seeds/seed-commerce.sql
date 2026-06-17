BEGIN;

-- Seed canonical shop categories
INSERT INTO "ShopCategory" ("id", "name", "slug", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
(
  gen_random_uuid()::text,
  'Pre-Workout',
  'pre-workout',
  true,
  10,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Protein',
  'protein',
  true,
  20,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Performance',
  'performance',
  true,
  30,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Recovery',
  'recovery',
  true,
  40,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Gear',
  'gear',
  true,
  50,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Product 1: Nitro Surge Pre-Workout
INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Nitro Surge Pre-Workout',
  'nitro-surge-pre-workout',
  'Fast-acting pre-workout blend for energy, focus, and clean training intensity.',
  (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'pre-workout'),
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "updatedAt" = NOW();

DELETE FROM "ProductImage" WHERE "productId" = (SELECT "id" FROM "Product" WHERE "slug" = 'nitro-surge-pre-workout');
INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'nitro-surge-pre-workout'),
  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1200&h=1200&fit=crop',
  'Nitro Surge pre-workout container',
  0,
  NOW()
);

INSERT INTO "ProductVariant" (
  "id", "productId", "title", "sku", "attributes", "priceInCents", "currency", "inventoryQuantity", "reservedQuantity", "isActive", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'nitro-surge-pre-workout'),
  'Blue Raspberry - 30 Servings',
  'VP-NITRO-30-BLUE',
  '{"flavor":"Blue Raspberry","size":"30 Servings"}'::jsonb,
  4499,
  'USD',
  80,
  0,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'nitro-surge-pre-workout'),
  'Fruit Punch - 30 Servings',
  'VP-NITRO-30-FP',
  '{"flavor":"Fruit Punch","size":"30 Servings"}'::jsonb,
  4499,
  'USD',
  65,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("sku") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "title" = EXCLUDED."title",
  "attributes" = EXCLUDED."attributes",
  "priceInCents" = EXCLUDED."priceInCents",
  "inventoryQuantity" = EXCLUDED."inventoryQuantity",
  "reservedQuantity" = EXCLUDED."reservedQuantity",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Product 2: Iso Lean Protein
INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Iso Lean Protein',
  'iso-lean-protein',
  'Whey isolate protein designed for lean muscle recovery and daily support.',
  (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'protein'),
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "updatedAt" = NOW();

DELETE FROM "ProductImage" WHERE "productId" = (SELECT "id" FROM "Product" WHERE "slug" = 'iso-lean-protein');
INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'iso-lean-protein'),
  'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&h=1200&fit=crop',
  'Iso Lean protein tub',
  0,
  NOW()
);

INSERT INTO "ProductVariant" (
  "id", "productId", "title", "sku", "attributes", "priceInCents", "currency", "inventoryQuantity", "reservedQuantity", "isActive", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'iso-lean-protein'),
  'Chocolate - 2lb',
  'VP-ISO-CHOC-2LB',
  '{"flavor":"Chocolate","size":"2lb"}'::jsonb,
  5999,
  'USD',
  54,
  0,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'iso-lean-protein'),
  'Vanilla - 2lb',
  'VP-ISO-VAN-2LB',
  '{"flavor":"Vanilla","size":"2lb"}'::jsonb,
  5999,
  'USD',
  49,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("sku") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "title" = EXCLUDED."title",
  "attributes" = EXCLUDED."attributes",
  "priceInCents" = EXCLUDED."priceInCents",
  "inventoryQuantity" = EXCLUDED."inventoryQuantity",
  "reservedQuantity" = EXCLUDED."reservedQuantity",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Product 3: Hydrate+ Electrolyte Mix
INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Hydrate+ Electrolyte Mix',
  'hydrate-plus-electrolyte-mix',
  'Performance hydration powder with sodium, potassium, and magnesium.',
  (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'recovery'),
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "updatedAt" = NOW();

DELETE FROM "ProductImage" WHERE "productId" = (SELECT "id" FROM "Product" WHERE "slug" = 'hydrate-plus-electrolyte-mix');
INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'hydrate-plus-electrolyte-mix'),
  'https://images.unsplash.com/photo-1611071536594-7f3985468e0e?w=1200&h=1200&fit=crop',
  'Hydrate plus electrolyte packets',
  0,
  NOW()
);

INSERT INTO "ProductVariant" (
  "id", "productId", "title", "sku", "attributes", "priceInCents", "currency", "inventoryQuantity", "reservedQuantity", "isActive", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'hydrate-plus-electrolyte-mix'),
  'Lemon Lime - 20 Sticks',
  'VP-HYDRATE-LL-20',
  '{"flavor":"Lemon Lime","size":"20 Sticks"}'::jsonb,
  3299,
  'USD',
  110,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("sku") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "title" = EXCLUDED."title",
  "attributes" = EXCLUDED."attributes",
  "priceInCents" = EXCLUDED."priceInCents",
  "inventoryQuantity" = EXCLUDED."inventoryQuantity",
  "reservedQuantity" = EXCLUDED."reservedQuantity",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Product 4: Power Band Set
INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Power Band Set',
  'power-band-set',
  'Heavy-duty resistance band set for strength, mobility, and warmups.',
  (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'performance'),
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "updatedAt" = NOW();

DELETE FROM "ProductImage" WHERE "productId" = (SELECT "id" FROM "Product" WHERE "slug" = 'power-band-set');
INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'power-band-set'),
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1200&h=1200&fit=crop',
  'Resistance bands for training',
  0,
  NOW()
);

INSERT INTO "ProductVariant" (
  "id", "productId", "title", "sku", "attributes", "priceInCents", "currency", "inventoryQuantity", "reservedQuantity", "isActive", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'power-band-set'),
  '3-Pack (Light/Medium/Heavy)',
  'VP-BANDS-3PK',
  '{"pack":"3-Pack"}'::jsonb,
  2599,
  'USD',
  95,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("sku") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "title" = EXCLUDED."title",
  "attributes" = EXCLUDED."attributes",
  "priceInCents" = EXCLUDED."priceInCents",
  "inventoryQuantity" = EXCLUDED."inventoryQuantity",
  "reservedQuantity" = EXCLUDED."reservedQuantity",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Product 5: Vara Performance Tee
INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Vara Performance Tee',
  'vara-performance-tee',
  'Premium training t-shirt with athletic fit and moisture-wicking fabric.',
  (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'gear'),
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "categoryId" = EXCLUDED."categoryId",
  "isActive" = EXCLUDED."isActive",
  "isFeatured" = EXCLUDED."isFeatured",
  "updatedAt" = NOW();

DELETE FROM "ProductImage" WHERE "productId" = (SELECT "id" FROM "Product" WHERE "slug" = 'vara-performance-tee');
INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "sortOrder", "createdAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'vara-performance-tee'),
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=1200&fit=crop',
  'Black training t-shirt',
  0,
  NOW()
);

INSERT INTO "ProductVariant" (
  "id", "productId", "title", "sku", "attributes", "priceInCents", "currency", "inventoryQuantity", "reservedQuantity", "isActive", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'vara-performance-tee'),
  'Black / M',
  'VP-TEE-BLK-M',
  '{"color":"Black","size":"M"}'::jsonb,
  3499,
  'USD',
  42,
  0,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'vara-performance-tee'),
  'Black / L',
  'VP-TEE-BLK-L',
  '{"color":"Black","size":"L"}'::jsonb,
  3499,
  'USD',
  38,
  0,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  (SELECT "id" FROM "Product" WHERE "slug" = 'vara-performance-tee'),
  'Sand / M',
  'VP-TEE-SAND-M',
  '{"color":"Sand","size":"M"}'::jsonb,
  3499,
  'USD',
  24,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("sku") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "title" = EXCLUDED."title",
  "attributes" = EXCLUDED."attributes",
  "priceInCents" = EXCLUDED."priceInCents",
  "inventoryQuantity" = EXCLUDED."inventoryQuantity",
  "reservedQuantity" = EXCLUDED."reservedQuantity",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Discount codes for testing
INSERT INTO "DiscountCode" (
  "id", "code", "description", "type", "percentOff", "amountOffInCents", "minSubtotalInCents", "usageLimit", "usedCount", "isActive", "createdAt", "updatedAt"
)
VALUES
(
  gen_random_uuid()::text,
  'WELCOME10',
  '10% off first order',
  'PERCENT',
  10,
  NULL,
  NULL,
  NULL,
  0,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'FREESHIP75',
  'Simulated shipping credit over $75',
  'FIXED',
  NULL,
  750,
  7500,
  NULL,
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description",
  "type" = EXCLUDED."type",
  "percentOff" = EXCLUDED."percentOff",
  "amountOffInCents" = EXCLUDED."amountOffInCents",
  "minSubtotalInCents" = EXCLUDED."minSubtotalInCents",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

COMMIT;
