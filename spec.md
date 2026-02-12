# Gemini Multi-User Desktop App Specification

## Project Overview
*   **App Name**: Gemini Desktop (Multi-User)
*   **Target OS**: Ubuntu 24.04 LTS (deb package)
*   **Tech Stack**: Electron (2026 Stable), React, Tailwind CSS, Zustand, TypeScript

## Core Features
1.  **Session Isolation**: Use `session.fromPartition('persist:<user_id>')` for complete Google account session isolation.
2.  **User Management**:
    *   Users are identified by a UUID or Hash.
    *   User list is persisted in local storage (store a JSON file in `userData`).
    *   Sidebar allows switching between users.
3.  **Split View**: Vertical split view for simultaneous browsing of two sessions.
4.  **View Management**: Use `WebContentsView` (Main Process) to manage multiple session views.

## Technical Constraints & Requirements
*   **First Step**: Create `.gitignore` to exclude Node.js, Electron, and build artifacts.
*   **Environment**: Build, test, and static analysis must run in `.devcontainer` (Ubuntu 24.04 based).
*   **System Libraries**: Include `libnss3`, `libatk-bridge2.0-0`, and other Electron dependencies in `.devcontainer`.
*   **SDD (Spec Driven Development)**: Define detailed interface designs and Playwright test cases before coding.
*   **Agentic Logic**:
    *   `WebContentsView` for view management.
    *   User ID management via UUID/Hash.
    *   Persist user list.

## Implementation Steps
1.  **Initialization**: `npm init`, install dependencies (electron, react, tailwindcss, lucide-react, zustand). Configure `.devcontainer`.
2.  **Main Process Implementation**:
    *   Session management logic.
    *   IPC communication (add user, switch user, split view control).
3.  **Renderer Process Implementation**:
    *   UI with Tailwind CSS (Sidebar, Tabs, Split Layout).
    *   Zustand for global UI state (active user, split mode).
4.  **WebView Integration**: `WebContentsView` dynamic generation and session attachment.
5.  **Build Configuration**: `electron-builder` for Ubuntu 24.04 `.deb` package generation.
6.  **Verification**: Test execution and packaging confirmation.

## Criticism & Checks
*   Ensure session ID has `persist:` prefix.
*   Check User-Agent for Google Login compatibility.
*   Verify correct session reference in Split View.
*   Check sandbox permissions for Ubuntu 24.04.
