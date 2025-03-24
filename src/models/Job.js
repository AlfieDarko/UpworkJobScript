class Job {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.link = data.link;
        this.summary = data.summary;
        this.budget = data.budget;
        this.clientVerified = data.clientVerified;
        this.clientSpent = data.clientSpent;
    }

    static fromRssEntry(entry) {
        return new Job({
            id: entry.guid || entry.link,
            title: entry.title,
            link: entry.link,
            summary: entry.contentSnippet,
            budget: this.extractBudget(entry.contentSnippet),
            clientVerified: entry.contentSnippet.includes("Payment verified"),
            clientSpent: this.extractClientSpent(entry.contentSnippet)
        });
    }

    static extractBudget(summary) {
        if (!summary) return 0;

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
                    return hourlyRate * 40;
                }
            }
        }

        return 0;
    }

    static extractClientSpent(summary) {
        const spentMatch = summary.match(/Spent\s*\$([0-9,]+)/i);
        return spentMatch ? parseInt(spentMatch[1].replace(",", ""), 10) : 0;
    }

    getBudgetDisplay() {
        return this.budget > 0 ? `$${this.budget}` : 'Not specified';
    }

    toTrelloCard() {
        return {
            name: `[${this.priority.toUpperCase()}] ${this.title}`,
            desc: this.formatTrelloDescription(),
            pos: "top",
            labels: [this.priority]
        };
    }

    formatTrelloDescription() {
        const emojis = {
            verified: this.clientVerified ? '✅' : '⚠️',
            budget: '💰',
            spent: '💵',
            link: '🔗'
        };

        return `
${this.summary}

${emojis.verified} Client Status: ${this.clientVerified ? 'Payment Verified' : 'Not Verified'}
${emojis.budget} Budget: ${this.getBudgetDisplay()}
${emojis.spent} Client Spent: $${this.clientSpent}
${emojis.link} [Apply Here](${this.link})
        `.trim();
    }

    toSlackMessage(category, priority) {
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

        return {
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
                        text: `*${this.title}*`
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Budget:*\n${this.getBudgetDisplay()}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Client Status:*\n${this.clientVerified ? '✅ Verified' : '⚠️ Not Verified'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Client Spent:*\n$${this.clientSpent}`
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
                            url: this.link
                        }
                    ]
                }
            ]
        };
    }
}

module.exports = Job; 