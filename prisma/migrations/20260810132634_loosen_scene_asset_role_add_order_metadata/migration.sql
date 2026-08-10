/*
  Warnings:

  - Changed the type of `role` on the `scene_assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "scene_assets" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- DropEnum
DROP TYPE "scene_asset_role";

-- CreateIndex
CREATE INDEX "scene_assets_sceneId_order_idx" ON "scene_assets"("sceneId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "scene_assets_sceneId_assetId_role_key" ON "scene_assets"("sceneId", "assetId", "role");
