const axios = require('axios');
const { config } = require('../config/config');

class SlackService {
    constructor() {
        this.webhookUrl = config.slack.webhookUrl;
        this.rateLimit = config.slack.rateLimit;
        this.queue = [];
        this.isProcessing = false;
        this.lastMessageTime = 0;
    }

    queueNotification(job, jobInfo) {
        this.queue.push({ job, jobInfo });
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`Processing ${this.queue.length} Slack notifications`);

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastMessage = now - this.lastMessageTime;
            
            if (timeSinceLastMessage < this.rateLimit.delayBetweenMessages) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.rateLimit.delayBetweenMessages - timeSinceLastMessage)
                );
            }

            const { job, jobInfo } = this.queue.shift();
            await this.sendNotification(job, jobInfo);
            this.lastMessageTime = Date.now();
        }

        this.isProcessing = false;
        console.log('Finished processing Slack notifications');
    }

    async sendNotification(job, { category, priority }) {
        try {
            await axios.post(this.webhookUrl, job.toSlackMessage(category, priority));
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.log('Slack rate limit hit, requeueing message');
                this.queue.unshift({ job, jobInfo: { category, priority } });
            } else {
                console.error("Error sending Slack notification:", error.response ? error.response.data : error.message);
            }
        }
    }

    async waitForQueueCompletion() {
        while (this.queue.length > 0 || this.isProcessing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

module.exports = SlackService; 