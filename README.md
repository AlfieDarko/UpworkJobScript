# Upwork Job Filter

A Node.js automation tool that filters Upwork jobs based on budget tiers and automatically organizes them in Trello boards with Slack notifications for quick-win opportunities.

## Features

- Fetches jobs from Upwork RSS feed
- Categorizes jobs based on budget tiers:
  - Quick Wins: ≤ $300
  - Medium Projects: ≤ $1,500
  - High Value: > $1,500
- Automatically creates Trello cards in appropriate lists
- Sends Slack notifications for quick-win opportunities
- Extracts key information like budget and client spending history
- Prevents duplicate job processing using a minimal tracking system
- Automatic cleanup of old entries (older than 7 days)
- Automatic archiving of old Trello cards

## Prerequisites

- Node.js
- Upwork RSS feed URL
- Trello API credentials (API Key and Token)
- Trello Board ID
- Slack Webhook URL

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
UPWORK_RSS_FEED_URL=your_upwork_rss_feed_url
TRELLO_API_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_ID=your_trello_board_id
SLACK_WEBHOOK_URL=your_slack_webhook_url
TRELLO_LIST_QUICK_WINS=your_quick_wins_list_id
TRELLO_LIST_MEDIUM_PROJECTS=your_medium_projects_list_id
TRELLO_LIST_HIGH_VALUE=your_high_value_list_id
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Dependencies

- axios: For making HTTP requests
- rss-parser: For parsing Upwork RSS feed
- dotenv: For loading environment variables

## Usage

Run the script:
```bash
node upwork_job_filter.js
```

The script will:
1. Clean up old entries from the processed jobs file
2. Archive old Trello cards (older than 7 days)
3. Fetch jobs from your Upwork RSS feed
4. Filter out any previously processed jobs
5. Categorize each new job based on its budget
6. Create Trello cards in the appropriate lists
7. Send Slack notifications for quick-win opportunities
8. Track processed jobs to prevent duplicates

## Duplicate Prevention

The script maintains a minimal `processed_jobs.json` file that tracks only the essential information:
- Job ID (unique identifier from the RSS feed)
- Timestamp of when the job was processed

This lightweight tracking system prevents:
- Duplicate cards in Trello
- Duplicate Slack notifications
- Processing the same job multiple times when running the script repeatedly

The tracking is done using the job's unique identifier (GUID or URL) from the RSS feed.

## Automatic Cleanup

The script includes automatic cleanup features to prevent data accumulation:

1. **Processed Jobs File**: Entries older than 7 days are automatically removed from the `processed_jobs.json` file
2. **Trello Cards**: Cards older than 7 days are automatically archived (moved to the archive section of your Trello board)

This ensures that:
- The processed jobs file remains minimal and efficient
- Your Trello board stays organized with only recent opportunities
- Old cards are preserved in the archive for reference

## Trello Board Structure

The script expects three lists in your Trello board:
- Quick Wins (for jobs ≤ $300)
- Medium Projects (for jobs ≤ $1,500)
- High Value (for jobs > $1,500)

## Error Handling

The script includes error handling for:
- RSS feed fetching
- Trello API interactions
- Slack notifications
- File operations for duplicate tracking
- Cleanup operations

## Contributing

Feel free to submit issues and enhancement requests! 