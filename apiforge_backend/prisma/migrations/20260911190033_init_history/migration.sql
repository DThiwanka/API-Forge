-- CreateTable
CREATE TABLE `request_executions` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `environmentId` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `status` INTEGER NULL,
    `statusText` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `responseSize` INTEGER NULL,
    `contentType` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `errorType` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_executions_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    INDEX `request_executions_workspaceId_requestId_createdAt_idx`(`workspaceId`, `requestId`, `createdAt`),
    INDEX `request_executions_workspaceId_status_createdAt_idx`(`workspaceId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `request_executions` ADD CONSTRAINT `request_executions_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_executions` ADD CONSTRAINT `request_executions_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_executions` ADD CONSTRAINT `request_executions_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_executions` ADD CONSTRAINT `request_executions_environmentId_fkey` FOREIGN KEY (`environmentId`) REFERENCES `environments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
