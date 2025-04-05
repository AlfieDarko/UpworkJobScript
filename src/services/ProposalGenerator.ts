import OpenAI from 'openai';
import { ProposalContext, Proposal } from '../types';

export class ProposalGenerator {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateProposal(context: ProposalContext): Promise<Proposal> {
        const prompt = this.buildPrompt(context);
        
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are an expert freelancer writing proposals for Upwork jobs. Write in a professional yet conversational tone. Focus on demonstrating expertise and understanding of the client's needs. Do not discuss specific pricing in the proposal."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        return {
            content: completion.choices[0].message.content || '',
            jobPost: context.jobPost,
            generatedAt: new Date(),
            status: 'pending'
        };
    }

    private buildPrompt(context: ProposalContext): string {
        return `
Job Title: ${context.jobPost.title}
Description: ${context.jobPost.description}
Requirements: ${context.jobPost.requirements.join(', ')}

Client Information:
- History: ${context.jobPost.clientHistory}
- Verified: ${context.jobPost.clientVerified ? 'Yes' : 'No'}
- Total Spent: $${context.jobPost.clientSpent}

My Profile:
Skills: ${context.userProfile.skills.join(', ')}
Experience: ${context.userProfile.experience.join('\n')}

Relevant Projects:
${context.relevantProjects.map(project => `
Project: ${project.title}
Description: ${project.description}
Technologies: ${project.technologies.join(', ')}
Outcomes: ${project.outcomes.join('\n')}
`).join('\n')}

Please write a compelling proposal that:
1. Shows understanding of the client's needs
2. Highlights relevant experience and skills
3. Demonstrates expertise through specific examples
4. Maintains a professional yet conversational tone
5. Does not discuss specific pricing
6. Encourages further discussion

The proposal should be well-structured and easy to read, with clear sections for introduction, experience, approach, and closing.
`;
    }
} 