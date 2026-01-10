-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "paymentDetails" JSONB,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "shipping" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "subtotal" DECIMAL(65,30),
ADD COLUMN     "tax" DECIMAL(65,30);
