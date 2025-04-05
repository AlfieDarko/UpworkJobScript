import { ProposalValidation } from '../types';

export class ProposalValidator {
    async validate(proposal: string): Promise<ProposalValidation> {
        const issues: string[] = [];
        const suggestions: string[] = [];

        // Check for required elements
        if (!this.hasIntroduction(proposal)) {
            issues.push('Missing introduction section');
        }
        if (!this.hasExperience(proposal)) {
            issues.push('Missing experience section');
        }
        if (!this.hasApproach(proposal)) {
            issues.push('Missing approach section');
        }
        if (!this.hasClosing(proposal)) {
            issues.push('Missing closing section');
        }

        // Check length
        const length = proposal.length;
        if (length < 500) {
            issues.push('Proposal is too short (minimum 500 characters)');
        } else if (length > 2000) {
            issues.push('Proposal is too long (maximum 2000 characters)');
        }

        // Check for pricing discussion
        if (this.containsPricingDiscussion(proposal)) {
            issues.push('Proposal contains pricing discussion');
        }

        // Add suggestions for improvement
        if (this.needsMoreSpecificExamples(proposal)) {
            suggestions.push('Consider adding more specific examples of past work');
        }
        if (this.needsMoreTechnicalDetails(proposal)) {
            suggestions.push('Consider adding more technical details about your approach');
        }

        return {
            isValid: issues.length === 0,
            issues,
            suggestions
        };
    }

    private hasIntroduction(proposal: string): boolean {
        const firstParagraph = proposal.split('\n\n')[0].toLowerCase();
        return firstParagraph.includes('hello') || 
               firstParagraph.includes('hi') || 
               firstParagraph.includes('greetings');
    }

    private hasExperience(proposal: string): boolean {
        const lowerProposal = proposal.toLowerCase();
        return lowerProposal.includes('experience') || 
               lowerProposal.includes('worked on') || 
               lowerProposal.includes('developed');
    }

    private hasApproach(proposal: string): boolean {
        const lowerProposal = proposal.toLowerCase();
        return lowerProposal.includes('approach') || 
               lowerProposal.includes('methodology') || 
               lowerProposal.includes('process');
    }

    private hasClosing(proposal: string): boolean {
        const lastParagraph = proposal.split('\n\n').pop()?.toLowerCase() || '';
        return lastParagraph.includes('thank') || 
               lastParagraph.includes('looking forward') || 
               lastParagraph.includes('contact');
    }

    private containsPricingDiscussion(proposal: string): boolean {
        const lowerProposal = proposal.toLowerCase();
        const pricingTerms = [
            'budget', 'rate', 'cost', 'price', 'hourly', 
            'fixed price', 'payment', 'milestone'
        ];
        return pricingTerms.some(term => lowerProposal.includes(term));
    }

    private needsMoreSpecificExamples(proposal: string): boolean {
        const lowerProposal = proposal.toLowerCase();
        return !lowerProposal.includes('example') && 
               !lowerProposal.includes('project') && 
               !lowerProposal.includes('case');
    }

    private needsMoreTechnicalDetails(proposal: string): boolean {
        const lowerProposal = proposal.toLowerCase();
        const technicalTerms = [
            'architecture', 'framework', 'api', 'database', 
            'frontend', 'backend', 'deployment'
        ];
        return !technicalTerms.some(term => lowerProposal.includes(term));
    }
} 