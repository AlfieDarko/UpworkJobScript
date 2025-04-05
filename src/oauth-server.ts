import express from 'express';
import { config } from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

config();

const app = express();
const port = process.env.PORT || 3000;

// Store tokens in a file (in production, use a proper database)
const TOKENS_FILE = path.join(__dirname, '../.tokens.json');

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is required');
    }

    try {
        // Exchange the authorization code for access and refresh tokens
        const response = await axios.post('https://www.upwork.com/api/v3/oauth2/tokens', {
            grant_type: 'authorization_code',
            code,
            client_id: process.env.UPWORK_CLIENT_ID,
            client_secret: process.env.UPWORK_CLIENT_SECRET,
            redirect_uri: process.env.OAUTH_CALLBACK_URL
        });

        const { access_token, refresh_token } = response.data;

        // Save tokens to file
        fs.writeFileSync(TOKENS_FILE, JSON.stringify({
            access_token,
            refresh_token,
            timestamp: Date.now()
        }));

        res.send(`
            <html>
                <body>
                    <h1>Authorization Successful!</h1>
                    <p>You can close this window and return to the application.</p>
                    <script>
                        // Close window after 5 seconds
                        setTimeout(() => window.close(), 5000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Authorization Failed</h1>
                    <p>There was an error during the authorization process. Please try again.</p>
                    <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
                </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`OAuth server listening on port ${port}`);
    console.log(`Callback URL: ${process.env.OAUTH_CALLBACK_URL}`);
}); 