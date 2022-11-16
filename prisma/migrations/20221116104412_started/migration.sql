-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME,
    "address_1" TEXT NOT NULL,
    "address_2" TEXT,
    "zip_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT,
    "feesIncluded" BOOLEAN NOT NULL DEFAULT false,
    "logo" TEXT,
    "imageBlurhash" TEXT,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "edition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizatorId" TEXT,
    "limitPerForm" INTEGER NOT NULL DEFAULT 50
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_subdomain_key" ON "Event"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Event_customDomain_key" ON "Event"("customDomain");

-- CreateIndex
CREATE INDEX "Event_subdomain_id_customDomain_idx" ON "Event"("subdomain", "id", "customDomain");
