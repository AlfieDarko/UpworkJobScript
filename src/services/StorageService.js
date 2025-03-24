const fs = require('fs').promises;
const { config } = require('../config/config');

class StorageService {
    constructor() {
        this.processedJobsFile = config.storage.processedJobsFile;
    }

    async loadProcessedJobs() {
        try {
            const data = await fs.readFile(this.processedJobsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveProcessedJobs(jobs) {
        try {
            await fs.writeFile(this.processedJobsFile, JSON.stringify(jobs, null, 2));
        } catch (error) {
            console.error("Error saving processed jobs:", error);
        }
    }

    async cleanupProcessedJobs() {
        const processedJobs = await this.loadProcessedJobs();
        const now = new Date();
        const cutoffDate = new Date(now.setDate(now.getDate() - config.storage.cleanupDays));

        const recentJobs = processedJobs.filter(job => {
            const jobDate = new Date(job.timestamp);
            return jobDate > cutoffDate;
        });

        await this.saveProcessedJobs(recentJobs);
        console.log(`Cleaned up ${processedJobs.length - recentJobs.length} old entries from processed jobs`);
    }
}

module.exports = StorageService; 