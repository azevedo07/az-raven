-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('PENDING', 'UPLOADING', 'READY', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "storageKey" TEXT,
    "storageProvider" TEXT,
    "status" "asset_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_projectId_idx" ON "assets"("projectId");

-- CreateIndex
CREATE INDEX "assets_projectId_status_idx" ON "assets"("projectId", "status");

-- CreateIndex
CREATE INDEX "assets_hash_idx" ON "assets"("hash");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
