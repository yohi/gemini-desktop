# Gemini Desktop Multi-User

このプロジェクトは、セッション分離機能を備えたGeminiデスクトップアプリケーションです。
ElectronとReactを使用して構築されており、ユーザーごとに独立した環境でGeminiを利用することができます。これにより、複数のアカウントを使い分けたり、検索履歴やCookieを分離したりすることが容易になります。

## 主な機能

*   **マルチユーザーサポート**: 複数のユーザープロファイルを作成し、サイドバーから簡単に切り替えることができます。
*   **セッション分離**: 各ユーザーは完全に分離されたセッション（Cookie、ローカルストレージなど）を持ちます。
*   **スプリットビュー**: ユーザーをドラッグ＆ドロップすることで、2つの画面を並べて表示することができます。
*   **ユーザー管理**: ユーザーの追加と削除が簡単に行えます。
*   **モダンなUI**: Tailwind CSSを使用したシンプルで使いやすいインターフェース。

## 技術スタック

*   **Electron**: デスクトップアプリケーションフレームワーク
*   **React**: UIライブラリ
*   **TypeScript**: 型安全性
*   **Tailwind CSS**: スタイリング
*   **Zustand**: ステート管理
*   **Playwright**: E2Eテスト

## 動作環境

*   Node.js (推奨: 最新のLTSバージョン)
*   npm

## Google認証の設定 (OAuth 2.0)

本アプリケーションは、Googleのセキュリティポリシーに準拠するため、システムブラウザを経由したOAuth 2.0認証（Loopback Flow）を採用しています。機能を有効にするには、以下の設定が必要です。

### 1. Google Cloud Consoleの設定

1.  [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成します。
2.  **APIとサービス > 認証情報** から「認証情報を作成」を選択し、「**OAuth クライアント ID**」を作成します。
3.  アプリケーションの種類で「**デスクトップ アプリ**」を選択します。
4.  作成された **クライアント ID** を控えておきます。

### 2. ビルド設定 (GitHub Actions / CI)

GitHub Actionsでビルドする場合、セキュリティのためにクライアントIDをSecretsから注入する仕組みになっています。

1.  GitHubリポジトリの **Settings > Secrets and variables > Actions** に移動します。
2.  `New repository secret` をクリックします。
3.  **Name**: `GOOGLE_CLIENT_ID`
4.  **Value**: 取得したクライアントID (例: `xxxxx.apps.googleusercontent.com`)
5.  保存します。

これで、GitHub Actions上でビルドが実行される際に自動的にIDが埋め込まれます。

### 3. ローカル開発時の設定

ローカルで `npm run dev` やビルドを行う場合は、ソースコード内のプレースホルダーを一時的に書き換える必要があります。

1.  `src/main/auth.ts` を開きます。
2.  `const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_PLACEHOLDER';` の部分を、実際のクライアントIDに書き換えます。
    ```typescript
    const GOOGLE_CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
    ```
3.  **注意**: クライアントIDを含んだファイルをコミットしないように注意してください（誤ってコミットしても直ちに危険ではありませんが、管理上推奨されません）。

## インストール

1.  リポジトリをクローンし、作成されたディレクトリに移動します。
    ```bash
    git clone <repository-url>
    cd <cloned-directory>
    ```

2.  依存関係をインストールします。
    ```bash
    npm install
    ```

## 使い方

### 開発モード

開発サーバーを起動し、変更をリアルタイムで確認できます。

```bash
npm run dev
```

### ビルド

本番用のアプリケーションをビルドします。

```bash
npm run build
```

### テスト

Playwrightを使用したテストを実行します。

```bash
npm test
```

## プロジェクト構造

*   `src/main`: メインプロセス（Electronのバックエンドロジック、ウィンドウ管理、IPC通信）
*   `src/renderer`: レンダラープロセス（Reactフロントエンド、UIコンポーネント）
*   `tests`: テストコード

## ライセンス

MIT
