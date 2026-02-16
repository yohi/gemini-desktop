import { shell, safeStorage, ipcMain, BrowserWindow, app } from 'electron';
import { Issuer, generators, Client, TokenSet } from 'openid-client';
import http from 'http';
import url from 'url';
import Store from 'electron-store';
import crypto from 'crypto';

// Dynamically derive encryption key for store
const getEncryptionKey = () => {
  if (safeStorage.isEncryptionAvailable()) {
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
let redirectUri = 'http://127.0.0.1:3000/callback';

// CONFIGURATION
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/cloud-platform';

export async function initAuth(): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Missing GOOGLE_CLIENT_ID environment variable.');
    return false;
  }

  try {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    client = new googleIssuer.Client({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uris: [redirectUri],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
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

  const port = await startLocalServer(mainWindow);
  
  redirectUri = `http://127.0.0.1:${port}/callback`;
  
  const authUrl = client.authorizationUrl({
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  await shell.openExternal(authUrl);
  return 'Login started. Please check your browser.';
}

function startLocalServer(mainWindow: BrowserWindow): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) server.close();

    let timeoutHandle: NodeJS.Timeout;

    const shutdown = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (server) {
            server.close();
            server = null;
        }
    };

    const startTimeout = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => {
            console.warn('Auth server timed out');
            shutdown();
            mainWindow.webContents.send('auth:error', 'Authentication timed out');
        }, 120000);
    };

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

          shutdown();
          
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

    const createServerAndListen = (port: number, isFallback = false) => {
        const srv = http.createServer(requestHandler);
        server = srv;

        srv.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE' && !isFallback) {
                console.warn('Port 3000 in use, trying ephemeral port...');
                srv.close();
                createServerAndListen(0, true);
            } else {
                console.error('Server error:', e);
                shutdown();
                if (!isFallback) reject(e);
                else mainWindow.webContents.send('auth:error', (e as Error).message);
            }
        });

        srv.listen(port, '127.0.0.1', () => {
            const addr = srv.address();
            const actualPort = typeof addr === 'object' && addr ? addr.port : port;
            console.log(`Loopback server listening on port ${actualPort}`);
            startTimeout();
            resolve(actualPort);
        });
    };

    createServerAndListen(3000);
  });
}

async function saveToken(tokenSet: TokenSet) {
  if (safeStorage.isEncryptionAvailable() && tokenSet.refresh_token) {
    const encrypted = safeStorage.encryptString(tokenSet.refresh_token);
    (store as any).set('tokens.refresh_token_encrypted', encrypted.toString('hex'));
  } else if (tokenSet.refresh_token) {
    (store as any).set('tokens.refresh_token_plain', tokenSet.refresh_token);
  }
}

async function loadToken() {
  if (!client) {
      const success = await initAuth();
      if (!success) return null;
  }
  if (!client) return null;
  
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
    const tokenSet = await client.refresh(refreshToken);
    await saveToken(tokenSet);
    return tokenSet.access_token;
  } catch (e) {
    console.error('Token refresh failed:', e);
    return null;
  }
}
