import axios from 'axios';
import { config } from 'dotenv';
import { JobPost } from '../types';

config();

interface UpworkApiConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

interface FeedConfig {
    name: string;
    searchQuery: string;
    keywords: string[];
    minBudget?: number;
    maxBudget?: number;
}

export class UpworkApiService {
    private config: UpworkApiConfig;
    private feeds: FeedConfig[];
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.config = {
            clientId: process.env.UPWORK_CLIENT_ID || '',
            clientSecret: process.env.UPWORK_CLIENT_SECRET || '',
            refreshToken: process.env.UPWORK_REFRESH_TOKEN || ''
        };
        this.feeds = this.initializeFeeds();
    }

    private initializeFeeds(): FeedConfig[] {
        const feedNames = (process.env.UPWORK_FEEDS || '').split(',');
        
        return feedNames.map(name => {
            return {
                name,
                searchQuery: this.getSearchQueryForFeed(name),
                keywords: this.getKeywordsForFeed(name),
                minBudget: this.getMinBudgetForFeed(name),
                maxBudget: this.getMaxBudgetForFeed(name)
            };
        });
    }

    private getSearchQueryForFeed(feedName: string): string {
        const queryMap: Record<string, string> = {
            'react-nextjs': 'react next.js typescript javascript',
            'ml': 'machine learning python tensorflow pytorch',
            'rust': 'rust systems programming'
        };

        return queryMap[feedName] || '';
    }

    private getKeywordsForFeed(feedName: string): string[] {
        const keywordMap: Record<string, string[]> = {
            'react-nextjs': ['react', 'next.js', 'nextjs', 'typescript', 'javascript'],
            'ml': ['machine learning', 'ml', 'ai', 'python', 'tensorflow', 'pytorch'],
            'rust': ['rust', 'systems programming', 'performance']
        };

        return keywordMap[feedName] || [];
    }

    private getMinBudgetForFeed(feedName: string): number | undefined {
        const minBudgetMap: Record<string, number> = {
            'react-nextjs': 30,
            'ml': 50,
            'rust': 40
        };

        return minBudgetMap[feedName];
    }

    private getMaxBudgetForFeed(feedName: string): number | undefined {
        const maxBudgetMap: Record<string, number> = {
            'react-nextjs': 100,
            'ml': 150,
            'rust': 120
        };

        return maxBudgetMap[feedName];
    }

    async fetchJobs(): Promise<JobPost[]> {
        const allJobs: JobPost[] = [];

        for (const feed of this.feeds) {
            try {
                const feedJobs = await this.fetchFeedJobs(feed);
                allJobs.push(...feedJobs);
            } catch (error) {
                console.error(`Error fetching jobs from ${feed.name}:`, error);
            }
        }

        return allJobs;
    }

    private async fetchFeedJobs(feed: FeedConfig): Promise<JobPost[]> {
        await this.ensureAccessToken();

        try {
            const response = await axios.get('https://www.upwork.com/api/profiles/v2/search/jobs', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    q: feed.searchQuery,
                    sort: 'recency',
                    duration_v3: '3', // 3+ months
                    paging: '0;50', // First 50 results
                    client_location: 'United States', // Optional: filter by client location
                }
            });

            const jobs = response.data.jobs.map((job: any) => ({
                title: job.title,
                description: job.snippet,
                requirements: this.extractRequirements(job.snippet),
                clientHistory: job.client.history || 'No history available',
                clientVerified: job.client.paymentVerified || false,
                clientSpent: job.client.totalSpent || 0,
                url: `https://www.upwork.com/jobs/${job.ciphertext}`,
                publishedAt: new Date(job.createdOn),
                feedType: feed.name,
                budget: this.extractBudgetFromApi(job)
            }));

            return jobs.filter((job: JobPost) => this.matchesFeedCriteria(job, feed));
        } catch (error) {
            console.error(`Error fetching jobs for ${feed.name}:`, error);
            return [];
        }
    }

    private async ensureAccessToken(): Promise<void> {
        // Check if we have a valid token
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return;
        }

        try {
            const response = await axios.post('https://www.upwork.com/api/v3/oauth2/tokens', {
                grant_type: 'refresh_token',
                refresh_token: this.config.refreshToken,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            });

            this.accessToken = response.data.access_token;
            // Set token expiry to 1 hour from now (or use expires_in from response)
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh Upwork access token');
        }
    }

    private extractRequirements(content: string): string[] {
        const requirements: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.toLowerCase().includes('required') || 
                line.toLowerCase().includes('requirements') ||
                line.toLowerCase().includes('skills')) {
                const skills = line.match(/[A-Za-z#+]+/g) || [];
                requirements.push(...skills);
            }
        }

        return [...new Set(requirements)];
    }

    private extractBudgetFromApi(job: any): number {
        if (job.amount && job.amount.amount) {
            return job.amount.amount;
        }
        return 0;
    }

    private matchesFeedCriteria(job: JobPost, feed: FeedConfig): boolean {
        const hasKeywords = feed.keywords.some(keyword => 
            job.title.toLowerCase().includes(keyword.toLowerCase()) ||
            job.description.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasKeywords) return false;

        if (feed.minBudget && job.budget < feed.minBudget) return false;
        if (feed.maxBudget && job.budget > feed.maxBudget) return false;

        return true;
    }
} 