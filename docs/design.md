# Gemini Desktop - Multi-User Architecture

## 1. System Architecture

The application follows the standard Electron architecture:
- **Main Process**: Handles window creation, session management, view orchestration (`WebContentsView`), and persistence.
- **Renderer Process**: Provides the UI for user management (sidebar) and split-view controls.
- **IPC**: Communication bridge between Main and Renderer.

## 2. Session Management (Main Process)

The core feature is session isolation using Electron's `session.fromPartition`.

- **User Identity**: Each user is assigned a unique UUID.
- **Partition Format**: `persist:user_<uuid>`
- **Isolation**:
  - Cookies, LocalStorage, IndexedDB are isolated per partition.
  - `User-Agent` can be customized if needed for Google Login.

### Session Manager Module (`src/main/session-manager.ts`)
- `createSession(userId: string)`: Returns a `session` object for the given user.
- `clearSession(userId: string)`: Clears data for a user.

## 3. Window & View Management (Main Process)

We use `WebContentsView` (the modern replacement for `BrowserView`) to render web content.

- **Main Window**: The container for the application.
- **Views**:
  - **Sidebar View**: Renderer process UI (User list, controls). Always visible on the left.
  - **Content Views**: `WebContentsView` instances loading `https://gemini.google.com` (or other URL).
  - **Split View**:
    - Mode A: Single View (One active user).
    - Mode B: Split View (Two active users side-by-side).

### Window Manager Module (`src/main/window-manager.ts`)
- `switchUser(userId: string)`: Detaches current view, attaches new view.
- `enableSplitView(userId1: string, userId2: string)`: Resizes views to 50% width each.
- `disableSplitView()`: Restores full width for primary user.

## 4. Data Persistence (Main Process)

- **User Store**: A JSON file (`users.json`) in `app.getPath('userData')`.
- **Schema**:
  ```typescript
  interface User {
    id: string;
    name: string;
    avatar?: string;
    lastActive: number;
  }
  ```
- **Operations**: `getUsers`, `addUser`, `removeUser`, `updateUser`.

## 5. IPC Channels

| Channel | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `get-users` | Renderer -> Main | - | Request list of users |
| `users-updated` | Main -> Renderer | `User[]` | Push updated user list |
| `create-user` | Renderer -> Main | `{ name: string }` | Create a new user profile |
| `switch-user` | Renderer -> Main | `{ userId: string }` | Switch active view to user |
| `toggle-split` | Renderer -> Main | `{ primaryId: string, secondaryId: string }` | Toggle split view |
| `resize-window` | Main -> Renderer | `{ width: number, height: number }` | Notify resize (optional) |

## 6. Renderer State (Zustand)

- **Store**: `useStore`
- **State**:
  - `users`: List of users.
  - `activeUserId`: ID of the currently focused user.
  - `splitMode`: Boolean.
  - `secondaryUserId`: ID of the second user in split mode.

## 7. Security & Permissions

- **Context Isolation**: Enabled (`contextIsolation: true`).
- **Sandboxing**: Enabled (`sandbox: true`) where possible.
- **CSP**: Strict Content Security Policy for Renderer.
- **User-Agent**: Use a standard Chrome UA to avoid Google login blocks.
