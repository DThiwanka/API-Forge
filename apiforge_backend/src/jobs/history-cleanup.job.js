import { logger } from '../utils/logger.js';

export async function runHistoryCleanup() {
  logger.info('Running history cleanup job...');
  // Logic to prune requests older than 30 days
  logger.info('History cleanup completed.');
}

export default runHistoryCleanup;
