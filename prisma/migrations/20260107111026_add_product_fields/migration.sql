-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT,
ADD COLUMN     "image" TEXT;

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
