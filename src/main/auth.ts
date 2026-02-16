import { shell, safeStorage, ipcMain, BrowserWindow, app } from 'electron';
import { Issuer, generators, Client, TokenSet } from 'openid-client';
import http from 'http';
import url from 'url';
import Store from 'electron-store';
import crypto from 'crypto';

// Dynamically derive encryption key for store
// In production, this should ideally be something consistent but unique to the machine
const getEncryptionKey = () => {
  if (safeStorage.isEncryptionAvailable()) {
    // If safeStorage works, we can use a static key for the store wrapper
    // because the actual tokens are encrypted by safeStorage individually.
    // But to satisfy requirements, we derive one.
    return crypto.createHash('sha256').update(app.getPath('userData')).digest('hex');
  }
  return 'gemini-desktop-fallback-key';
};

// Initialize store for tokens (encrypted)
const store = new Store<{ tokens: Record<string, string> }>({
  name: 'auth-tokens',
  encryptionKey: getEncryptionKey()
});

let client: Client | null = null;
let codeVerifier: string | null = null;
let server: http.Server | null = null;
let redirectUri = 'http://127.0.0.1:3000/callback'; // Default, updated dynamically if port changes

// CONFIGURATION: REPLACE WITH YOUR GOOGLE CLOUD CREDENTIALS
// NOTE: For Gemini API, you need to enable "Vertex AI API" or "Generative Language API"
const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_PLACEHOLDER';
const GOOGLE_CLIENT_SECRET = ''; // Native apps don't use secrets (PKCE instead)
const SCOPES = 'openid email profile https://www.googleapis.com/auth/cloud-platform'; // Adjust scopes as needed

export async function initAuth(): Promise<boolean> {
  try {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    client = new googleIssuer.Client({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uris: [redirectUri], // Will be updated in startLogin if needed
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client
    });
    return true;
  } catch (err) {
    console.error('Failed to discover Google Issuer:', err);
    return false;
  }
}

export function registerAuthHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('auth:login', async () => {
    return await startLogin(mainWindow);
  });

  ipcMain.handle('auth:logout', async () => {
    (store as any).delete('tokens');
    return true;
  });

  ipcMain.handle('auth:get-token', async () => {
    return loadToken();
  });
}

async function startLogin(mainWindow: BrowserWindow): Promise<string> {
  if (!client) {
    const success = await initAuth();
    if (!success) throw new Error('Auth client initialization failed');
  }
  if (!client) throw new Error('Auth client not initialized');

  codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  // Start Loopback Server
  const port = await startLocalServer(mainWindow);
  
  // Update redirect URI if port changed
  redirectUri = `http://127.0.0.1:${port}/callback`;
  // Note: Client might need re-instantiation or direct property update if supported,
  // but openid-client usually takes redirect_uri in authorizationUrl too?
  // Actually, authorizationUrl takes redirect_uri.
  
  const authUrl = client.authorizationUrl({
    redirect_uri: redirectUri, // Explicitly pass current redirect URI
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request Refresh Token
    prompt: 'consent',
  });

  // Open System Browser
  await shell.openExternal(authUrl);
  return 'Login started. Please check your browser.';
}

function startLocalServer(mainWindow: BrowserWindow): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) server.close();

    const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      try {
        const reqUrl = url.parse(req.url || '', true);
        
        if (reqUrl.pathname === '/callback') {
          console.log('Received callback from Google');
          
          if (!client) throw new Error('Client not initialized');
          const params = client.callbackParams(req);
          
          if (!codeVerifier) throw new Error('Missing code_verifier');

          const tokenSet = await client.callback(redirectUri, params, { code_verifier: codeVerifier });
          console.log('Token exchange successful');

          await saveToken(tokenSet);

          // Success Response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Login Successful</h1>
                <p>You can close this window and return to Gemini Desktop.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          // Cleanup
          shutdown();
          
          // Focus app and notify renderer
          mainWindow.focus();
          mainWindow.webContents.send('auth:success', { 
            accessToken: tokenSet.access_token,
            profile: tokenSet.claims()
          });

        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (err) {
        console.error('Callback error:', err);
        res.writeHead(500);
        res.end('Authentication failed.');
        shutdown();
        mainWindow.webContents.send('auth:error', (err as Error).message);
      }
    };

    server = http.createServer(requestHandler);

    // Timeout safety
    const timeoutHandle = setTimeout(() => {
        console.warn('Auth server timed out');
        shutdown();
        mainWindow.webContents.send('auth:error', 'Authentication timed out');
    }, 120000); // 2 minutes

    const shutdown = () => {
        clearTimeout(timeoutHandle);
        if (server) {
            server.close();
            server = null;
        }
    };

    server.on('error', (e: any) => {
      clearTimeout(timeoutHandle);
      if (e.code === 'EADDRINUSE') {
         // Retry logic would go here if we were implementing robust port hunting
         // For now, reject to let caller handle or try next port logic outside
         // But prompt asked to "try binding to a free port".
         // Let's rely on listen(0) for ephemeral port if 3000 fails? 
         // Or just reject for now as we need to keep this simple for the diff.
         console.error('Port 3000 in use');
         // We will try port 0 (random) if 3000 fails
         if (server) server.close();
         server = http.createServer(requestHandler);
         server.listen(0, '127.0.0.1', () => {
             const addr = server?.address();
             const port = typeof addr === 'object' && addr ? addr.port : 0;
             console.log(`Fallback: Loopback server listening on ephemeral port ${port}`);
             resolve(port);
         });
      } else {
         console.error('Server error:', e);
         reject(e);
      }
    });

    server.listen(3000, '127.0.0.1', () => {
      console.log('Loopback server listening on port 3000');
      resolve(3000);
    });
  });
}

async function saveToken(tokenSet: TokenSet) {
  // Use safeStorage if available (macOS/Windows)
  if (safeStorage.isEncryptionAvailable() && tokenSet.refresh_token) {
    const encrypted = safeStorage.encryptString(tokenSet.refresh_token);
    (store as any).set('tokens.refresh_token_encrypted', encrypted.toString('hex'));
  } else if (tokenSet.refresh_token) {
    // Fallback for Linux or dev: basic encryption by store
    (store as any).set('tokens.refresh_token_plain', tokenSet.refresh_token);
  }
}

async function loadToken() {
  if (!client) {
      const success = await initAuth();
      if (!success) return null;
  }
  if (!client) return null;
  
  // Try to load refresh token
  let refreshToken: string | undefined;
  
  const encrypted = (store as any).get('tokens.refresh_token_encrypted') as string;
  if (encrypted && safeStorage.isEncryptionAvailable()) {
    try {
      refreshToken = safeStorage.decryptString(Buffer.from(encrypted, 'hex'));
    } catch (e) {
      console.error('Failed to decrypt token:', e);
    }
  } else {
    refreshToken = (store as any).get('tokens.refresh_token_plain') as string;
  }

  if (!refreshToken) return null;

  try {
    // Refresh the access token
    // Using client directly since we checked it above
    const tokenSet = await client.refresh(refreshToken);
    await saveToken(tokenSet); // Save new refresh token if rotated
    return tokenSet.access_token;
  } catch (e) {
    console.error('Token refresh failed:', e);
    return null;
  }
}
