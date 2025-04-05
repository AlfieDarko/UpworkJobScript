import { ProposalValidation } from '../types';

export class ProposalValidator {
    validate(content: string): ProposalValidation {
        const issues: string[] = [];

        // Check for minimum length
        if (content.length < 200) {
            issues.push('Proposal is too short (minimum 200 characters)');
        }

        // Check for required sections
        const requiredSections = ['introduction', 'experience', 'approach'];
        for (const section of requiredSections) {
            if (!content.toLowerCase().includes(section)) {
                issues.push(`Missing ${section} section`);
            }
        }

        // Check for pricing discussion
        if (content.toLowerCase().includes('$') || 
            content.toLowerCase().includes('rate') || 
            content.toLowerCase().includes('budget')) {
            issues.push('Proposal contains pricing discussion');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
} 