const Parser = require('rss-parser');
const { config } = require('../config/config');
const Job = require('../models/Job');

class UpworkService {
    constructor() {
        this.parser = new Parser();
        this.rssFeedUrl = config.upwork.rssFeedUrl;
    }

    async fetchJobs() {
        try {
            const feed = await this.parser.parseURL(this.rssFeedUrl);
            return feed.items.map(entry => Job.fromRssEntry(entry));
        } catch (error) {
            console.error("Error fetching RSS feed:", error);
            return [];
        }
    }
}

module.exports = UpworkService; 