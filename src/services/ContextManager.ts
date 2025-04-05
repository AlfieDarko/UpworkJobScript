import { UserProfile, Project } from '../types';

export class ContextManager {
    private userProfile: UserProfile;
    private projects: Project[];

    constructor() {
        // Initialize with default values
        this.userProfile = {
            skills: ['React', 'Next.js', 'TypeScript', 'Node.js'],
            experience: [
                '5+ years of web development',
                '3+ years of React and Next.js',
                '2+ years of TypeScript'
            ],
            hourlyRate: 75
        };

        this.projects = [
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
        ];
    }

    getUserProfile(): UserProfile {
        return this.userProfile;
    }

    findRelevantProjects(requirements: string[]): Project[] {
        return this.projects.filter(project => {
            const projectTechnologies = project.technologies.map(tech => tech.toLowerCase());
            return requirements.some(req => 
                projectTechnologies.includes(req.toLowerCase())
            );
        });
    }
} 