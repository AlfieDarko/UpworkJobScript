const axios = require('axios');
const Parser = require('rss-parser');
const dotenv = require('dotenv');

dotenv.config();

const parser = new Parser();

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

// Fetch jobs from Upwork RSS
async function fetchUpworkJobs() {
    try {
        const feed = await parser.parseURL(UPWORK_RSS_FEED_URL);
        return feed.items.map(entry => ({
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
    const budgetMatch = summary.match(/Budget:\s*\$([0-9,]+)/i);
    return budgetMatch ? parseInt(budgetMatch[1].replace(",", ""), 10) : 0;
}

// Extract client's past spending
function extractClientSpent(summary) {
    const spentMatch = summary.match(/Spent\s*\$([0-9,]+)/i);
    return spentMatch ? parseInt(spentMatch[1].replace(",", ""), 10) : 0;
}

// Categorize jobs based on budget
function categorizeJob(job) {
    if (job.budget <= BUDGET_TIERS.quickWins) {
        return "quickWins";
    } else if (job.budget <= BUDGET_TIERS.mediumProjects) {
        return "mediumProjects";
    } else {
        return "highValue";
    }
}

// Add job to Trello
async function addToTrello(job, category) {
    const url = `https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
    const data = {
        idList: TRELLO_LISTS[category],
        name: job.title,
        desc: `${job.summary}\n\n🔗 [Apply Here](${job.link})`,
        pos: "top"
    };

    try {
        const response = await axios.post(url, data);
        return response.status === 200;
    } catch (error) {
        console.error("Error adding to Trello:", error.response ? error.response.data : error.message);
        return false;
    }
}

// Send Slack notification for Quick Wins
async function sendSlackNotification(job, category) {
    if (category === "quickWins") {
        const message = {
            text: `🔔 *New Quick Win Job!* 🚀\n*${job.title}*\n💰 Budget: $${job.budget}\n🔗 [Apply Here](${job.link})`
        };
        try {
            await axios.post(SLACK_WEBHOOK_URL, message);
        } catch (error) {
            console.error("Error sending Slack notification:", error.response ? error.response.data : error.message);
        }
    }
}

// Main function
async function main() {
    const jobs = await fetchUpworkJobs();

    for (const job of jobs) {
        const category = categorizeJob(job);
        const addedToTrello = await addToTrello(job, category);

        if (addedToTrello && category === "quickWins") {
            await sendSlackNotification(job, category);
        }
    }
}

// Run the script
main();
