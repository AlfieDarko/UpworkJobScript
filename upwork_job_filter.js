const axios = require('axios');
const Parser = require('rss-parser');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

const parser = new Parser();
const PROCESSED_JOBS_FILE = 'processed_jobs.json';
const CLEANUP_DAYS = 7; // Number of days after which to clean up entries

// Load environment variables
const UPWORK_RSS_FEED_URL = process.env.UPWORK_RSS_FEED_URL;
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Trello List IDs
const TRELLO_LISTS = {
    quickWins: process.env.TRELLO_LIST_QUICK_WINS,
    mediumProjects: process.env.TRELLO_LIST_MEDIUM_PROJECTS,
    highValue: process.env.TRELLO_LIST_HIGH_VALUE
};

// Budget Tiers
const BUDGET_TIERS = {
    quickWins: 300,
    mediumProjects: 1500
};

// Job Priority Levels
const JOB_PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

// Slack Rate Limiting Constants
const SLACK_RATE_LIMIT = {
    MESSAGES_PER_MINUTE: 50,  // Slack's default rate limit for webhooks
    DELAY_BETWEEN_MESSAGES: 1200, // 1.2 seconds between messages to stay well under the limit
    BATCH_SIZE: 10
};

// Queue for Slack notifications
let slackQueue = [];
let isProcessingSlackQueue = false;
let lastSlackMessageTime = 0;

// Load processed jobs from file
async function loadProcessedJobs() {
    try {
        const data = await fs.readFile(PROCESSED_JOBS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
}

// Save processed jobs to file
async function saveProcessedJobs(jobs) {
    try {
        await fs.writeFile(PROCESSED_JOBS_FILE, JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error("Error saving processed jobs:", error);
    }
}

// Clean up old entries from processed jobs
async function cleanupProcessedJobs() {
    const processedJobs = await loadProcessedJobs();
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - CLEANUP_DAYS));

    // Filter out entries older than CLEANUP_DAYS
    const recentJobs = processedJobs.filter(job => {
        const jobDate = new Date(job.timestamp);
        return jobDate > cutoffDate;
    });

    await saveProcessedJobs(recentJobs);
    console.log(`Cleaned up ${processedJobs.length - recentJobs.length} old entries from processed jobs`);
}

// Archive old Trello cards
async function archiveOldTrelloCards() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
    
    // Get all cards from all lists in a single API call
    try {
        const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
        const response = await axios.get(url);
        const cards = response.data;

        // Filter cards that need to be archived
        const cardsToArchive = cards.filter(card => {
            const cardDate = new Date(card.dateLastActivity);
            return cardDate < cutoffDate && !card.closed; // Only archive if not already closed
        });

        if (cardsToArchive.length === 0) {
            console.log('No cards to archive');
            return;
        }

        console.log(`Found ${cardsToArchive.length} cards to archive`);

        // Archive cards in batches to avoid rate limiting
        const BATCH_SIZE = 10;
        for (let i = 0; i < cardsToArchive.length; i += BATCH_SIZE) {
            const batch = cardsToArchive.slice(i, i + BATCH_SIZE);
            const archivePromises = batch.map(card => {
                const archiveUrl = `https://api.trello.com/1/cards/${card.id}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
                return axios.put(archiveUrl, { closed: true })
                    .then(() => {
                        console.log(`Archived card: ${card.name}`);
                        return true;
                    })
                    .catch(error => {
                        console.error(`Failed to archive card ${card.name}:`, error.response ? error.response.data : error.message);
                        return false;
                    });
            });

            // Wait for current batch to complete before processing next batch
            await Promise.all(archivePromises);
            
            // Add a small delay between batches to respect rate limits
            if (i + BATCH_SIZE < cardsToArchive.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`Completed archiving ${cardsToArchive.length} cards`);
    } catch (error) {
        console.error('Error during card archiving:', error.response ? error.response.data : error.message);
    }
}

// Fetch jobs from Upwork RSS
async function fetchUpworkJobs() {
    try {
        const feed = await parser.parseURL(UPWORK_RSS_FEED_URL);
        return feed.items.map(entry => ({
            id: entry.guid || entry.link,
            title: entry.title,
            link: entry.link,
            summary: entry.contentSnippet,
            budget: extractBudget(entry.contentSnippet),
            clientVerified: entry.contentSnippet.includes("Payment verified"),
            clientSpent: extractClientSpent(entry.contentSnippet)
        }));
    } catch (error) {
        console.error("Error fetching RSS feed:", error);
        return [];
    }
}

// Extract budget from job description
function extractBudget(summary) {
    if (!summary) return 0;

    // Try to find budget in different formats
    const budgetPatterns = [
        /Budget:\s*\$([0-9,]+)/i,
        /Budget:\s*([0-9,]+)\s*USD/i,
        /Budget:\s*([0-9,]+)\s*USD\/hr/i,
        /Budget:\s*([0-9,]+)\s*USD\/hour/i,
        /Budget:\s*([0-9,]+)\s*USD\/hr\./i,
        /Budget:\s*([0-9,]+)\s*USD\/hour\./i
    ];

    for (const pattern of budgetPatterns) {
        const match = summary.match(pattern);
        if (match) {
            const amount = parseInt(match[1].replace(/,/g, ''), 10);
            if (!isNaN(amount) && amount > 0) {
                return amount;
            }
        }
    }

    // If no budget found, check if it's hourly
    const hourlyPatterns = [
        /\$([0-9,]+)\s*\/hr/i,
        /\$([0-9,]+)\s*\/hour/i,
        /\$([0-9,]+)\s*\/hr\./i,
        /\$([0-9,]+)\s*\/hour\./i
    ];

    for (const pattern of hourlyPatterns) {
        const match = summary.match(pattern);
        if (match) {
            const hourlyRate = parseInt(match[1].replace(/,/g, ''), 10);
            if (!isNaN(hourlyRate) && hourlyRate > 0) {
                // Convert hourly rate to estimated project value (assuming 40 hours)
                return hourlyRate * 40;
            }
        }
    }

    return 0;
}

// Extract client's past spending
function extractClientSpent(summary) {
    const spentMatch = summary.match(/Spent\s*\$([0-9,]+)/i);
    return spentMatch ? parseInt(spentMatch[1].replace(",", ""), 10) : 0;
}

// Categorize jobs based on multiple factors
function categorizeJob(job) {
    // First determine the budget category
    let category;
    const budget = job.budget || 0; // Handle null/undefined budget

    if (budget <= BUDGET_TIERS.quickWins) {
        category = "quickWins";
    } else if (budget <= BUDGET_TIERS.mediumProjects) {
        category = "mediumProjects";
    } else {
        category = "highValue";
    }

    // Determine priority based on multiple factors
    let priority = JOB_PRIORITY.MEDIUM;
    if (job.clientVerified && job.clientSpent > 1000) {
        priority = JOB_PRIORITY.HIGH;
    } else if (!job.clientVerified && job.clientSpent < 100) {
        priority = JOB_PRIORITY.LOW;
    }

    return { category, priority };
}

// Format job description for Trello
function formatTrelloDescription(job) {
    const emojis = {
        verified: job.clientVerified ? '✅' : '⚠️',
        budget: '💰',
        spent: '💵',
        link: '🔗'
    };

    const budgetDisplay = job.budget > 0 
        ? `$${job.budget}`
        : 'Not specified';

    return `
${job.summary}

${emojis.verified} Client Status: ${job.clientVerified ? 'Payment Verified' : 'Not Verified'}
${emojis.budget} Budget: ${budgetDisplay}
${emojis.spent} Client Spent: $${job.clientSpent}
${emojis.link} [Apply Here](${job.link})
    `.trim();
}

// Add job to Trello
async function addToTrello(job, { category, priority }) {
    const url = `https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
    const data = {
        idList: TRELLO_LISTS[category],
        name: `[${priority.toUpperCase()}] ${job.title}`,
        desc: formatTrelloDescription(job),
        pos: "top",
        labels: [priority] // Add priority as a label
    };

    try {
        const response = await axios.post(url, data);
        return response.status === 200;
    } catch (error) {
        console.error("Error adding to Trello:", error.response ? error.response.data : error.message);
        return false;
    }
}

// Process Slack notification queue
async function processSlackQueue() {
    if (isProcessingSlackQueue || slackQueue.length === 0) {
        return;
    }

    isProcessingSlackQueue = true;
    console.log(`Processing ${slackQueue.length} Slack notifications`);

    while (slackQueue.length > 0) {
        const now = Date.now();
        const timeSinceLastMessage = now - lastSlackMessageTime;
        
        // Wait if we need to respect rate limits
        if (timeSinceLastMessage < SLACK_RATE_LIMIT.DELAY_BETWEEN_MESSAGES) {
            await new Promise(resolve => 
                setTimeout(resolve, SLACK_RATE_LIMIT.DELAY_BETWEEN_MESSAGES - timeSinceLastMessage)
            );
        }

        const { job, jobInfo } = slackQueue.shift();
        await sendSlackNotification(job, jobInfo);
        lastSlackMessageTime = Date.now();
    }

    isProcessingSlackQueue = false;
    console.log('Finished processing Slack notifications');
}

// Queue a Slack notification
function queueSlackNotification(job, jobInfo) {
    slackQueue.push({ job, jobInfo });
    processSlackQueue();
}

// Send Slack notification
async function sendSlackNotification(job, { category, priority }) {
    const emojis = {
        quickWins: '⚡',
        mediumProjects: '📊',
        highValue: '💎',
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };

    const categoryEmoji = emojis[category] || '📋';
    const priorityEmoji = emojis[priority] || '⚪';

    const budgetDisplay = job.budget > 0 
        ? `$${job.budget}`
        : 'Not specified';

    const message = {
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `${categoryEmoji} ${priorityEmoji} New Job Opportunity!`,
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${job.title}*`
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Budget:*\n${budgetDisplay}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Client Status:*\n${job.clientVerified ? '✅ Verified' : '⚠️ Not Verified'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Client Spent:*\n$${job.clientSpent}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Category:*\n${category.replace(/([A-Z])/g, ' $1').trim()}`
                    }
                ]
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Apply Now",
                            emoji: true
                        },
                        url: job.link
                    }
                ]
            }
        ]
    };

    try {
        await axios.post(SLACK_WEBHOOK_URL, message);
    } catch (error) {
        if (error.response && error.response.status === 429) {
            // Rate limit hit - requeue the message
            console.log('Slack rate limit hit, requeueing message');
            slackQueue.unshift({ job, jobInfo: { category, priority } });
        } else {
            console.error("Error sending Slack notification:", error.response ? error.response.data : error.message);
        }
    }
}

// Main function
async function main() {
    // Clean up old entries first
    await cleanupProcessedJobs();
    await archiveOldTrelloCards();

    const processedJobs = await loadProcessedJobs();
    const jobs = await fetchUpworkJobs();

    // Filter out already processed jobs
    const newJobs = jobs.filter(job => !processedJobs.some(pj => pj.id === job.id));

    for (const job of newJobs) {
        const jobInfo = categorizeJob(job);
        const addedToTrello = await addToTrello(job, jobInfo);

        if (addedToTrello) {
            // Add only ID and timestamp to processed jobs list
            processedJobs.push({
                id: job.id,
                timestamp: new Date().toISOString()
            });
            
            // Queue Slack notification instead of sending directly
            queueSlackNotification(job, jobInfo);
        }
    }

    // Save updated processed jobs list
    await saveProcessedJobs(processedJobs);

    // Wait for all Slack notifications to be processed
    while (slackQueue.length > 0 || isProcessingSlackQueue) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Run the script
main();
