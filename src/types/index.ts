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
    professionalSummary: string;
    skills: string[];
    experienceYears: number;
    achievements: string[];
    availability: {
        startDate: string;
        hoursPerWeek: number;
        timezone: string;
    };
}

export interface Project {
    name: string;
    description: string;
    technologies: string[];
    outcome: string;
    duration: string;
}

export interface ProposalContext {
    job: {
        title: string;
        description: string;
        requirements: string[];
        clientInfo: {
            history: string;
            verificationStatus: boolean;
            totalSpent: number;
        };
    };
    user: {
        profile: {
            summary: string;
            skills: string[];
            experience: number;
            achievements: string[];
        };
        availability: {
            startDate: string;
            hoursPerWeek: number;
            timezone: string;
        };
    };
    relevantProjects: Project[];
}

export interface ProposalValidation {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
}

export interface ProposalState {
    status: 'draft' | 'review' | 'approved' | 'submitted';
    history: {
        timestamp: Date;
        action: string;
        details: string;
    }[];
    metadata: {
        jobId: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    };
} 