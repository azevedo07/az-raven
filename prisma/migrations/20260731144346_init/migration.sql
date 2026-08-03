-- CreateEnum
CREATE TYPE "project_pipeline_status" AS ENUM ('idle', 'running', 'paused', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "module_execution_status" AS ENUM ('pending', 'active', 'done', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT,
    "language" TEXT,
    "objective" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_executions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "project_pipeline_status" NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_executions" (
    "id" TEXT NOT NULL,
    "pipelineExecutionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "module_execution_status" NOT NULL DEFAULT 'pending',
    "pct" INTEGER NOT NULL DEFAULT 0,
    "eta" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_events" (
    "id" TEXT NOT NULL,
    "pipelineExecutionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "moduleId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_ownerId_idx" ON "projects"("ownerId");

-- CreateIndex
CREATE INDEX "pipeline_executions_projectId_idx" ON "pipeline_executions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "module_executions_pipelineExecutionId_moduleId_key" ON "module_executions"("pipelineExecutionId", "moduleId");

-- CreateIndex
CREATE INDEX "pipeline_events_pipelineExecutionId_idx" ON "pipeline_events"("pipelineExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "versions_projectId_versionNumber_key" ON "versions"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_executions" ADD CONSTRAINT "pipeline_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_executions" ADD CONSTRAINT "module_executions_pipelineExecutionId_fkey" FOREIGN KEY ("pipelineExecutionId") REFERENCES "pipeline_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_pipelineExecutionId_fkey" FOREIGN KEY ("pipelineExecutionId") REFERENCES "pipeline_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions" ADD CONSTRAINT "versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
