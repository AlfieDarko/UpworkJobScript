const dotenv = require('dotenv');
dotenv.config();

// Environment Variables
const config = {
    upwork: {
        rssFeedUrl: process.env.UPWORK_RSS_FEED_URL
    },
    trello: {
        apiKey: process.env.TRELLO_API_KEY,
        token: process.env.TRELLO_TOKEN,
        boardId: process.env.TRELLO_BOARD_ID,
        lists: {
            quickWins: process.env.TRELLO_LIST_QUICK_WINS,
            mediumProjects: process.env.TRELLO_LIST_MEDIUM_PROJECTS,
            highValue: process.env.TRELLO_LIST_HIGH_VALUE
        }
    },
    slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        rateLimit: {
            messagesPerMinute: 50,
            delayBetweenMessages: 1200,
            batchSize: 10
        }
    },
    storage: {
        processedJobsFile: 'processed_jobs.json',
        cleanupDays: 7
    }
};

// Business Logic Constants
const constants = {
    budgetTiers: {
        quickWins: 300,
        mediumProjects: 1500
    },
    jobPriority: {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    }
};

module.exports = { config, constants }; 