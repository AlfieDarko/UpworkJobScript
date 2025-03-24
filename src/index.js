const UpworkService = require('./services/UpworkService');
const TrelloService = require('./services/TrelloService');
const SlackService = require('./services/SlackService');
const StorageService = require('./services/StorageService');
const JobCategorizer = require('./services/JobCategorizer');

class JobFilterApp {
    constructor() {
        this.upworkService = new UpworkService();
        this.trelloService = new TrelloService();
        this.slackService = new SlackService();
        this.storageService = new StorageService();
    }

    async initialize() {
        // Initialize Trello board and lists
        await this.trelloService.initializeBoard();
    }

    async run() {
        // Initialize services
        await this.initialize();

        // Clean up old entries first
        await this.storageService.cleanupProcessedJobs();
        await this.trelloService.archiveOldCards();

        const processedJobs = await this.storageService.loadProcessedJobs();
        const jobs = await this.upworkService.fetchJobs();

        // Filter out already processed jobs
        const newJobs = jobs.filter(job => !processedJobs.some(pj => pj.id === job.id));

        for (const job of newJobs) {
            const jobInfo = JobCategorizer.categorizeJob(job);
            const addedToTrello = await this.trelloService.addCard(job, jobInfo);

            if (addedToTrello) {
                // Add only ID and timestamp to processed jobs list
                processedJobs.push({
                    id: job.id,
                    timestamp: new Date().toISOString()
                });
                
                // Queue Slack notification
                this.slackService.queueNotification(job, jobInfo);
            }
        }

        // Save updated processed jobs list
        await this.storageService.saveProcessedJobs(processedJobs);

        // Wait for all Slack notifications to be processed
        await this.slackService.waitForQueueCompletion();
    }
}

// Run the application
const app = new JobFilterApp();
app.run().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
}); 