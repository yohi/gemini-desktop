import { shell, safeStorage, ipcMain, BrowserWindow } from 'electron';
import { Issuer, generators, Client, TokenSet } from 'openid-client';
import http from 'http';
import url from 'url';
import Store from 'electron-store';

// Initialize store for tokens (encrypted)
const store = new Store<{ tokens: Record<string, string> }>({
  name: 'auth-tokens',
  encryptionKey: 'gemini-desktop-secure-key' // Simple obfuscation for non-safeStorage envs
});

let client: Client | null = null;
let codeVerifier: string | null = null;
let server: http.Server | null = null;

// CONFIGURATION: REPLACE WITH YOUR GOOGLE CLOUD CREDENTIALS
// NOTE: For Gemini API, you need to enable "Vertex AI API" or "Generative Language API"
const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_PLACEHOLDER';
const GOOGLE_CLIENT_SECRET = ''; // Native apps don't use secrets (PKCE instead)
const REDIRECT_URI = 'http://127.0.0.1:3000/callback';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/cloud-platform'; // Adjust scopes as needed

export async function initAuth() {
  try {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    client = new googleIssuer.Client({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client
    });
  } catch (err) {
    console.error('Failed to discover Google Issuer:', err);
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
  if (!client) await initAuth();
  if (!client) throw new Error('Auth client not initialized');

  codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  // Start Loopback Server
  await startLocalServer(mainWindow);

  const authUrl = client.authorizationUrl({
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

function startLocalServer(mainWindow: BrowserWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) server.close();

    server = http.createServer(async (req, res) => {
      try {
        const reqUrl = url.parse(req.url || '', true);
        
        if (reqUrl.pathname === '/callback') {
          console.log('Received callback from Google');
          const params = client!.callbackParams(req);
          
          if (!codeVerifier) throw new Error('Missing code_verifier');

          const tokenSet = await client!.callback(REDIRECT_URI, params, { code_verifier: codeVerifier });
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

          server?.close();
          server = null;
          
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
        server?.close();
        server = null;
        mainWindow.webContents.send('auth:error', (err as Error).message);
      }
    });

    server.listen(3000, '127.0.0.1', () => {
      console.log('Loopback server listening on port 3000');
      resolve();
    });
    
    server.on('error', (e) => {
      console.error('Server error:', e);
      reject(e);
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
  if (!client) await initAuth();
  
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
    const tokenSet = await client!.refresh(refreshToken);
    await saveToken(tokenSet); // Save new refresh token if rotated
    return tokenSet.access_token;
  } catch (e) {
    console.error('Token refresh failed:', e);
    return null;
  }
}
