import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'latimore-legacy-session-secret'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: 'none',
  }));

  // OAuth Configuration
  const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
  const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
  const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
  const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

  // --- OAuth Routes ---

  // Facebook/Instagram Auth URL
  app.get('/api/auth/facebook/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
    const params = new URLSearchParams({
      client_id: FACEBOOK_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
      response_type: 'code',
      state: 'facebook',
    });
    res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` });
  });

  // Facebook Callback
  app.get('/api/auth/facebook/callback', async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;

    try {
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: FACEBOOK_CLIENT_ID,
          client_secret: FACEBOOK_CLIENT_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      });

      const { access_token } = tokenResponse.data;
      req.session!.facebookToken = access_token;

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'facebook' }, '*');
              window.close();
            </script>
            <p>Facebook authenticated successfully. Closing window...</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Facebook OAuth Error:', error.response?.data || error.message);
      res.status(500).send('Authentication failed');
    }
  });

  // Twitter Auth URL (OAuth 2.0 PKCE - simplified for this example)
  // Note: Modern Twitter API v2 uses PKCE, but for simplicity we'll assume a basic flow if possible or just provide a guide.
  // Implementing full PKCE in a script can be complex without a library, but I'll stick to a standard flow.
  app.get('/api/auth/twitter/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/twitter/callback`;
    // Using OAuth 2.0
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: TWITTER_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: 'state',
      code_challenge: 'challenge', // In a real app, this should be generated
      code_challenge_method: 'plain',
    });
    res.json({ url: `https://twitter.com/i/oauth2/authorize?${params}` });
  });

  app.get('/api/auth/twitter/callback', async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/twitter/callback`;

    try {
      // Exchange code for token
      const authHeader = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
      const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', 
        new URLSearchParams({
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge', // Matches code_challenge
        }),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      req.session!.twitterToken = tokenResponse.data.access_token;

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'twitter' }, '*');
              window.close();
            </script>
            <p>Twitter authenticated successfully. Closing window...</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Twitter OAuth Error:', error.response?.data || error.message);
      res.status(500).send('Authentication failed');
    }
  });

  // --- Action Routes ---

  app.get('/api/auth/status', (req, res) => {
    res.json({
      facebook: !!req.session?.facebookToken,
      twitter: !!req.session?.twitterToken,
    });
  });

  app.post('/api/social/publish', async (req, res) => {
    const { platform, content, imageUrl } = req.body;

    try {
      if (platform === 'facebook') {
        const token = req.session?.facebookToken;
        if (!token) return res.status(401).json({ error: 'Not connected to Facebook' });

        // For simplicity, posting to the user's feed or a page they own
        // First get accounts (pages)
        const accountsResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
        const pages = accountsResponse.data.data;
        if (pages.length === 0) return res.status(400).json({ error: 'No Facebook pages found' });

        const page = pages[0]; // Use the first page
        const pageToken = page.access_token;

        const postResponse = await axios.post(`https://graph.facebook.com/v18.0/${page.id}/feed`, {
          message: content,
          access_token: pageToken,
          ...(imageUrl && { link: imageUrl }) // Basic image sharing via link
        });

        return res.json({ success: true, postId: postResponse.data.id });
      }

      if (platform === 'twitter') {
        const token = req.session?.twitterToken;
        if (!token) return res.status(401).json({ error: 'Not connected to Twitter' });

        const postResponse = await axios.post('https://api.twitter.com/2/tweets', {
          text: content
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        return res.json({ success: true, postId: postResponse.data.data.id });
      }

      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error: any) {
      console.error('Publish Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to publish content' });
    }
  });

  app.get('/api/social/metrics', async (req, res) => {
    const { platform, postId } = req.query;

    try {
      if (platform === 'facebook') {
        const token = req.session?.facebookToken;
        if (!token) return res.status(401).json({ error: 'Not connected' });

        const metricsResponse = await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
          params: {
            fields: 'engagement,likes.summary(true),comments.summary(true),shares',
            access_token: token
          }
        });

        const data = metricsResponse.data;
        return res.json({
          likes: data.likes?.summary?.total_count || 0,
          comments: data.comments?.summary?.total_count || 0,
          shares: data.shares?.count || 0
        });
      }

      if (platform === 'twitter') {
        const token = req.session?.twitterToken;
        if (!token) return res.status(401).json({ error: 'Not connected' });

        const metricsResponse = await axios.get(`https://api.twitter.com/2/tweets/${postId}`, {
          params: {
            'tweet.fields': 'public_metrics'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const metrics = metricsResponse.data.data.public_metrics;
        return res.json({
          likes: metrics.like_count,
          comments: metrics.reply_count,
          shares: metrics.retweet_count + metrics.quote_count
        });
      }

      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error: any) {
      console.error('Metrics Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });


  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
