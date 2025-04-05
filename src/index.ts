import { config } from 'dotenv';
import { UpworkApiService } from './services/UpworkApiService';
import { ProposalGenerator } from './services/ProposalGenerator';
import { SlackService } from './services/SlackService';
import { JobPost } from './types';

// Load environment variables
config();

async function main() {
    const upworkService = new UpworkApiService();
    const proposalGenerator = new ProposalGenerator();
    const slackService = new SlackService();

    try {
        // Fetch jobs from Upwork
        console.log('Fetching jobs from Upwork...');
        const jobs = await upworkService.fetchJobs();
        console.log(`Found ${jobs.length} matching jobs`);

        // Process each job
        for (const job of jobs) {
            try {
                console.log(`Processing job: ${job.title}`);
                
                // Generate proposal
                const proposal = await proposalGenerator.generateProposal({
                    jobPost: job,
                    userProfile: {
                        skills: ['React', 'Next.js', 'TypeScript', 'Node.js'],
                        experience: [
                            '5+ years of web development',
                            '3+ years of React and Next.js',
                            '2+ years of TypeScript'
                        ],
                        hourlyRate: 75
                    },
                    relevantProjects: [
                        {
                            title: 'E-commerce Platform',
                            description: 'Built a full-stack e-commerce platform using Next.js and TypeScript',
                            technologies: ['Next.js', 'TypeScript', 'Node.js', 'MongoDB'],
                            outcomes: [
                                'Increased conversion rate by 25%',
                                'Reduced page load time by 40%',
                                'Improved SEO ranking by 35%'
                            ]
                        }
                    ]
                });

                // Post to Slack
                await slackService.postProposal(proposal);
                console.log(`Posted proposal for job: ${job.title}`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error processing job ${job.title}:`, errorMessage);
                await slackService.postError(`Error processing job ${job.title}: ${errorMessage}`);
            }
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in main process:', errorMessage);
        await slackService.postError(`Error in main process: ${errorMessage}`);
    }
}

// Run the example
main().catch(console.error); 