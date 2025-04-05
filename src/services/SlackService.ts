import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { Proposal } from '../types';

config();

export class SlackService {
    private client: WebClient;
    private channel: string;

    constructor() {
        this.client = new WebClient(process.env.SLACK_APP_TOKEN);
        this.channel = process.env.SLACK_CHANNEL || '';
    }

    async postProposal(proposal: Proposal): Promise<void> {
        try {
            await this.client.chat.postMessage({
                channel: this.channel,
                text: this.formatProposal(proposal),
                blocks: this.createProposalBlocks(proposal)
            });
        } catch (error) {
            console.error('Error posting to Slack:', error);
            throw error;
        }
    }

    async postError(message: string): Promise<void> {
        try {
            await this.client.chat.postMessage({
                channel: this.channel,
                text: `❌ Error: ${message}`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Error:* ${message}`
                        }
                    }
                ]
            });
        } catch (error) {
            console.error('Error posting error to Slack:', error);
            throw error;
        }
    }

    private formatProposal(proposal: Proposal): string {
        return `
*New Proposal Generated*
Job: ${proposal.jobPost.title}
Status: ${proposal.status}
Generated: ${proposal.generatedAt.toLocaleString()}

${proposal.content}
`;
    }

    private createProposalBlocks(proposal: Proposal): any[] {
        return [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎯 New Proposal Generated",
                    emoji: true
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Job:*\n${proposal.jobPost.title}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Status:*\n${proposal.status}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Budget:*\n$${proposal.jobPost.budget}/hr`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Client History:*\n${proposal.jobPost.clientHistory}`
                    }
                ]
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: proposal.content
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Generated on ${proposal.generatedAt.toLocaleString()}`
                    }
                ]
            }
        ];
    }
} 