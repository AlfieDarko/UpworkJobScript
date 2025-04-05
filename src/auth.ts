import { config } from 'dotenv';
import open from 'open';

config();

const clientId = process.env.UPWORK_CLIENT_ID;
const callbackUrl = process.env.OAUTH_CALLBACK_URL;

if (!clientId || !callbackUrl) {
    console.error('Missing required environment variables: UPWORK_CLIENT_ID or OAUTH_CALLBACK_URL');
    process.exit(1);
}

// Construct the authorization URL
const authUrl = `https://www.upwork.com/services/api/apply?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=jobs_read`;

console.log('Opening browser for Upwork authorization...');
console.log('After authorizing, you will be redirected to the callback URL.');
console.log('The refresh token will be saved in .tokens.json');

// Open the authorization URL in the default browser
open(authUrl); 