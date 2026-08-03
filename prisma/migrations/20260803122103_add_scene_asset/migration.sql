-- CreateEnum
CREATE TYPE "scene_asset_role" AS ENUM ('REFERENCE_IMAGE', 'REFERENCE_VIDEO', 'CONCEPT_ART', 'STORYBOARD', 'VOICE', 'MUSIC', 'SFX', 'DOCUMENT', 'PROMPT', 'MODEL', 'TEXTURE', 'FINAL_RENDER', 'OUTRO');

-- CreateTable
CREATE TABLE "scene_assets" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" "scene_asset_role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scene_assets_sceneId_idx" ON "scene_assets"("sceneId");

-- CreateIndex
CREATE INDEX "scene_assets_assetId_idx" ON "scene_assets"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "scene_assets_sceneId_assetId_role_key" ON "scene_assets"("sceneId", "assetId", "role");

-- AddForeignKey
ALTER TABLE "scene_assets" ADD CONSTRAINT "scene_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
