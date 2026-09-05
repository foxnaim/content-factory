-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'queued', 'scripting', 'script_ready', 'assets_generating', 'voice_generating', 'rendering', 'qa_pending', 'ready_for_review', 'approved', 'rejected', 'failed');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('draft', 'queued', 'processing', 'review', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('source', 'image', 'audio', 'video', 'metadata', 'manifest', 'license_evidence');

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "importHash" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'draft',
    "totalItems" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "externalId" TEXT,
    "topic" TEXT NOT NULL,
    "topicHash" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "targetDurationSec" INTEGER NOT NULL DEFAULT 45,
    "notes" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptVersion" (
    "id" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "sceneIndex" INTEGER,
    "kind" "AssetKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "byteLength" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "licenseId" TEXT,
    "evidenceKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAttempt" (
    "id" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "queueName" TEXT NOT NULL,
    "bullJobId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryable" BOOLEAN,

    CONSTRAINT "JobAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLog" (
    "id" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" UUID NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_projectId_idx" ON "Channel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_projectId_name_key" ON "Channel"("projectId", "name");

-- CreateIndex
CREATE INDEX "Batch_status_createdAt_idx" ON "Batch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_channelId_idempotencyKey_key" ON "Batch"("channelId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ContentItem_batchId_status_idx" ON "ContentItem"("batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_batchId_topicHash_key" ON "ContentItem"("batchId", "topicHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_batchId_externalId_key" ON "ContentItem"("batchId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptVersion_contentItemId_version_key" ON "ScriptVersion"("contentItemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptVersion_contentItemId_contentHash_key" ON "ScriptVersion"("contentItemId", "contentHash");

-- CreateIndex
CREATE INDEX "Asset_contentItemId_kind_idx" ON "Asset"("contentItemId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_bucket_objectKey_key" ON "Asset"("bucket", "objectKey");

-- CreateIndex
CREATE INDEX "JobAttempt_contentItemId_startedAt_idx" ON "JobAttempt"("contentItemId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobAttempt_bullJobId_attempt_key" ON "JobAttempt"("bullJobId", "attempt");

-- CreateIndex
CREATE INDEX "ItemLog_contentItemId_createdAt_idx" ON "ItemLog"("contentItemId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewDecision_contentItemId_createdAt_idx" ON "ReviewDecision"("contentItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_deduplicationKey_key" ON "NotificationOutbox"("deduplicationKey");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptVersion" ADD CONSTRAINT "ScriptVersion_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAttempt" ADD CONSTRAINT "JobAttempt_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLog" ADD CONSTRAINT "ItemLog_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
