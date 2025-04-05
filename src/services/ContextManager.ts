import { UserProfile, Project } from '../types';

export class ContextManager {
    async getUserProfile(userId: string): Promise<UserProfile> {
        // TODO: Implement actual user profile fetching from database
        // For MVP, return mock data
        return {
            professionalSummary: "Experienced full-stack developer with expertise in modern web technologies",
            skills: ["React", "Node.js", "TypeScript", "MongoDB"],
            experienceYears: 5,
            achievements: [
                "Built scalable e-commerce platforms",
                "Implemented real-time features for collaborative applications"
            ],
            availability: {
                startDate: "2024-04-15",
                hoursPerWeek: 40,
                timezone: "UTC-5"
            }
        };
    }

    async findRelevantProjects(requirements: string[], userId: string): Promise<Project[]> {
        // TODO: Implement actual project matching logic
        // For MVP, return mock data
        return [
            {
                name: "E-commerce Platform",
                description: "Built a full-featured e-commerce platform with real-time inventory management",
                technologies: ["React", "Node.js", "MongoDB"],
                outcome: "Successfully launched platform serving 10,000+ daily users",
                duration: "6 months"
            },
            {
                name: "Collaborative Task Manager",
                description: "Developed a real-time task management system with team collaboration features",
                technologies: ["React", "TypeScript", "WebSocket"],
                outcome: "Improved team productivity by 40%",
                duration: "3 months"
            }
        ];
    }
} 