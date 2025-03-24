const { constants } = require('../config/config');

class JobCategorizer {
    static categorizeJob(job) {
        // First determine the budget category
        let category;
        const budget = job.budget || 0;

        if (budget <= constants.budgetTiers.quickWins) {
            category = "quickWins";
        } else if (budget <= constants.budgetTiers.mediumProjects) {
            category = "mediumProjects";
        } else {
            category = "highValue";
        }

        // Determine priority based on multiple factors
        let priority = constants.jobPriority.MEDIUM;
        if (job.clientVerified && job.clientSpent > 1000) {
            priority = constants.jobPriority.HIGH;
        } else if (!job.clientVerified && job.clientSpent < 100) {
            priority = constants.jobPriority.LOW;
        }

        return { category, priority };
    }
}

module.exports = JobCategorizer; 