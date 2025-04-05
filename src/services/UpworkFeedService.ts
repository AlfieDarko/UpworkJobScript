import axios from 'axios';
import { config } from 'dotenv';
import { JobPost } from '../types';
import * as cheerio from 'cheerio';

config();

interface FeedConfig {
    name: string;
    searchUrl: string;
    keywords: string[];
    minBudget?: number;
    maxBudget?: number;
}

export class UpworkFeedService {
    private feeds: FeedConfig[];

    constructor() {
        this.feeds = this.initializeFeeds();
    }

    private initializeFeeds(): FeedConfig[] {
        const feedNames = (process.env.UPWORK_FEEDS || '').split(',');
        
        return feedNames.map(name => {
            return {
                name,
                searchUrl: this.getSearchUrlForFeed(name),
                keywords: this.getKeywordsForFeed(name),
                minBudget: this.getMinBudgetForFeed(name),
                maxBudget: this.getMaxBudgetForFeed(name)
            };
        });
    }

    private getSearchUrlForFeed(feedName: string): string {
        const baseUrl = 'https://www.upwork.com/nx/search/jobs/';
        const searchParams = new URLSearchParams({
            q: this.getSearchQueryForFeed(feedName),
            sort: 'recency',
            duration_v3: '3', // 3+ months
            paging: '0;50', // First 50 results
            client_location: 'United States', // Optional: filter by client location
        });

        return `${baseUrl}?${searchParams.toString()}`;
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
        try {
            const response = await axios.get(feed.searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const jobs: JobPost[] = [];

            // Select job cards from the search results
            $('article[data-test="job-tile"]').each((_, element) => {
                const jobElement = $(element);
                
                const title = jobElement.find('[data-test="job-title"]').text().trim();
                const description = jobElement.find('[data-test="job-description"]').text().trim();
                const url = jobElement.find('a[data-test="job-title-link"]').attr('href') || '';
                const budgetText = jobElement.find('[data-test="budget"]').text().trim();
                const clientInfo = jobElement.find('[data-test="client-info"]').text().trim();

                const job: JobPost = {
                    title,
                    description,
                    requirements: this.extractRequirements(description),
                    clientHistory: this.extractClientHistory(clientInfo),
                    clientVerified: this.isClientVerified(clientInfo),
                    clientSpent: this.extractClientSpent(clientInfo),
                    url: url.startsWith('http') ? url : `https://www.upwork.com${url}`,
                    publishedAt: new Date(),
                    feedType: feed.name,
                    budget: this.extractBudget(budgetText)
                };

                if (this.matchesFeedCriteria(job, feed)) {
                    jobs.push(job);
                }
            });

            return jobs;
        } catch (error) {
            console.error(`Error scraping jobs for ${feed.name}:`, error);
            return [];
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

    private extractClientHistory(content: string): string {
        const historyMatch = content.match(/client history:.*?(?=\n|$)/i);
        return historyMatch ? historyMatch[0] : 'No history available';
    }

    private isClientVerified(content: string): boolean {
        return content.toLowerCase().includes('payment verified');
    }

    private extractClientSpent(content: string): number {
        const spentMatch = content.match(/\$(\d+)k\+ spent/i);
        return spentMatch ? parseInt(spentMatch[1]) * 1000 : 0;
    }

    private extractBudget(content: string): number {
        const budgetMatch = content.match(/\$(\d+)(?:-\$(\d+))?\s*(?:per hour|hourly)/i);
        if (budgetMatch) {
            return parseInt(budgetMatch[1]);
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