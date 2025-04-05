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

export interface UserProfile {
    skills: string[];
    experience: string[];
    hourlyRate: number;
}

export interface Project {
    title: string;
    description: string;
    technologies: string[];
    outcomes: string[];
}

export interface ProposalContext {
    jobPost: JobPost;
    userProfile: UserProfile;
    relevantProjects: Project[];
}

export interface Proposal {
    content: string;
    jobPost: JobPost;
    generatedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ProposalValidation {
    isValid: boolean;
    issues: string[];
} 