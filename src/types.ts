export interface JobPost {
    title: string;
    description: string;
    requirements: string[];
    clientHistory: string;
    clientVerified: boolean;
    clientSpent: number;
    url: string;
    publishedAt: Date;
    feedType: string;
    budget: number;
}

export interface ProposalContext {
    jobPost: JobPost;
    userProfile: {
        skills: string[];
        experience: string[];
        hourlyRate: number;
    };
    relevantProjects: {
        title: string;
        description: string;
        technologies: string[];
        outcomes: string[];
    }[];
}

export interface Proposal {
    content: string;
    jobPost: JobPost;
    generatedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
} 