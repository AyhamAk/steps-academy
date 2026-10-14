-- CreateTable
CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ticketId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushDelivery_createdAt_idx" ON "PushDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "PushDelivery_userId_createdAt_idx" ON "PushDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PushDelivery_status_createdAt_idx" ON "PushDelivery"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
