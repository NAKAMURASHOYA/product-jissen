# 開発ログ

## 2025-01-23

### プロジェクト環境セットアップ

#### 完了した作業

1. **Next.jsプロジェクトの初期化**
   - TypeScript、Tailwind CSS、App Routerでセットアップ
   - 必要な設定ファイルを作成：
     - `tsconfig.json` - TypeScript設定
     - `next.config.js` - Next.js設定
     - `tailwind.config.ts` - Tailwind CSS設定（Shadcn UI対応）
     - `postcss.config.js` - PostCSS設定
     - `.eslintrc.json` - ESLint設定
     - `.gitignore` - Git除外設定
   - `src/app/`ディレクトリ構造を作成
   - `src/app/layout.tsx` - ルートレイアウト
   - `src/app/page.tsx` - ホームページ
   - `src/app/globals.css` - グローバルスタイル（Shadcn UIテーマ変数含む）

2. **Shadcn UIの初期化とコンポーネント追加**
   - Shadcn UIを初期化（`components.json`設定）
   - `src/lib/utils.ts` - ユーティリティ関数（cn関数）
   - 以下のコンポーネントを追加：
     - `src/components/ui/button.tsx` - Buttonコンポーネント
     - `src/components/ui/input.tsx` - Inputコンポーネント
     - `src/components/ui/label.tsx` - Labelコンポーネント
     - `src/components/ui/card.tsx` - Cardコンポーネント
     - `src/components/ui/sonner.tsx` - Toast (Sonner)コンポーネント
   - `layout.tsx`にToasterコンポーネントを追加

3. **依存ライブラリのインストール**
   - **Supabase**
     - `@supabase/ssr` - サーバーサイドレンダリング対応
     - `@supabase/supabase-js` - Supabaseクライアント
   - **バリデーション・フォーム**
     - `zod` - スキーマバリデーション
     - `react-hook-form` - フォーム管理
     - `@hookform/resolvers` - React Hook FormとZodの統合
   - **UI関連**
     - `sonner` - トースト通知
     - `lucide-react` - アイコンライブラリ（Sonner依存）
     - `clsx` - クラス名ユーティリティ
     - `tailwind-merge` - Tailwindクラスマージ
     - `tailwindcss-animate` - Tailwindアニメーション

4. **Supabaseクライアントの実装**
   - `src/lib/supabase/server.ts` - サーバーサイド用Supabaseクライアント
     - Next.jsの`cookies()`を使用したセッション管理
   - `src/lib/supabase/client.ts` - クライアントサイド用Supabaseクライアント
   - `src/types/database.types.ts` - データベース型定義（プレースホルダー）

5. **環境変数設定**
   - `.env.example` - 環境変数のテンプレートファイルを作成

#### インストール済みパッケージ

**Dependencies:**
- react, react-dom
- next
- @supabase/ssr, @supabase/supabase-js
- zod, react-hook-form, @hookform/resolvers
- sonner, lucide-react
- clsx, tailwind-merge
- @radix-ui/react-label, @radix-ui/react-slot
- next-themes

**DevDependencies:**
- typescript
- @types/node, @types/react, @types/react-dom
- tailwindcss, tailwindcss-animate
- postcss, autoprefixer
- eslint, eslint-config-next

#### 次のステップ

1. Supabaseプロジェクトの設定と環境変数の設定（`.env.local`）
2. データベース型定義の生成（`src/types/database.types.ts`を更新）
3. 設計ドキュメント（`docs/station4/doc copy.md`）に基づく実装開始

## 2025-01-26

### データベース構築と認証機能の実装

#### 完了した作業

1. **Supabaseデータベース構築**
   - 設計書に基づき以下のテーブルを作成
     - `users`, `organizations`, `organization_members`
     - `departments`, `invitations`
     - `skills`, `user_skills`, `endorsements`
   - 各テーブルへのRLSポリシー設定
   - 自動化ロジック（トリガー関数、RPC）の実装
   - Storageバケット(`avatars`)の作成とポリシー設定

2. **型定義の反映**
   - Supabase CLIを使用して `src/types/database.types.ts` を最新化

3. **認証機能の実装**
   - **バリデーションスキーマ**
     - `src/lib/schema.ts` に認証・プロフィール・スキル用のZodスキーマを定義
   - **Server Actions**
     - `src/actions/auth.ts` にサインアップ・ログイン・ログアウト処理を実装
   - **UI実装**
     - サインアップ画面: `src/app/signup/page.tsx`
     - ログイン画面: `src/app/login/page.tsx`
   - **依存パッケージ追加**
     - `class-variance-authority` (UIコンポーネントのスタイル制御用)

#### 次のステップ

1. 組織作成・参加機能（オンボーディング）の実装
   - Server Actions (`createOrgAction`, `joinOrgAction`) の作成
   - オンボーディング画面 (`src/app/onboarding/page.tsx`) の作成

## 2025-01-26 (続き)

### 組織管理機能の実装とコード品質改善

#### 完了した作業

1. **組織管理Server Actionsの実装**
   - `src/actions/organization.ts` を作成
   - **createOrganizationAction**: 組織を新規作成するアクション
     - RPC関数 `create_new_organization` を呼び出し
     - 作成者をownerとして自動追加
     - 作成成功後、組織のホームページへリダイレクト
     - slug重複時のエラーハンドリング
   - **joinOrganizationAction**: 招待コードで組織に参加するアクション
     - RPC関数 `join_organization_by_code` を呼び出し
     - 参加した組織のslugを取得してリダイレクト
     - エラーハンドリング（無効なコード、期限切れなど）

2. **オンボーディング画面の実装**
   - `src/app/onboarding/page.tsx` を作成
   - 組織作成フォームと招待コード入力フォームを実装
   - React Hook FormとZodを使用したバリデーション
   - エラーメッセージとトースト通知の実装

3. **コード品質の改善**
   - **スペルチェックエラーの修正**
     - 関数名を変更: `createOrgAction` → `createOrganizationAction`
     - 関数名を変更: `joinOrgAction` → `joinOrganizationAction`
     - コメント内の "Org" 略語を "Organization" に変更
   - **TypeScript型エラーの修正**
     - Supabase RPC関数の型推論問題に対応
     - `@ts-expect-error` コメントを追加（暫定対応）
     - `organization.slug` の型アサーションを追加
     - すべての型エラーを解消

4. **SQLマイグレーションスクリプトの作成**
   - `supabase/migrations/001_initial_schema.sql` を作成
   - 設計書に基づく全テーブル定義
   - RLSポリシーの設定
   - トリガー関数とRPC関数の実装
   - インデックスの作成

#### 技術的な課題と対応

1. **Supabase RPC関数の型推論問題**
   - 問題: TypeScriptがRPC関数の型を正しく推論できない
   - 対応: `@ts-expect-error` コメントで暫定対応
   - 今後の改善: Supabase CLIで型定義を再生成するか、型定義ファイルを手動で更新

2. **organization.slug の型推論問題**
   - 問題: Supabaseクエリ結果の型が `never` と推論される
   - 対応: 型アサーション `(organization as { slug: string }).slug` を使用

#### 次のステップ

1. 組織ホーム画面の実装
2. メンバー一覧画面の実装
3. 感謝送信機能の実装
4. プロフィール編集機能の実装

## 2025-01-28

### 組織ホーム画面・メンバー一覧・感謝送信機能の実装

#### 完了した作業

1. **組織ホーム画面の実装**
   - `src/app/slug/page.tsx` - 組織ダッシュボードページ
     - 今月の感謝数、タイムライン、人気スキルのカード表示
   - `src/app/slug/layout.tsx` - 組織コンテキストのレイアウト
     - サイドバーナビゲーション（ホーム、メンバー、設定）
     - 所属組織の切り替え機能
     - ログアウトボタン
     - ログインチェック・メンバーシップチェック
     - モバイル対応ヘッダー

2. **メンバー一覧画面の実装**
   - `src/app/slug/members/page.tsx` - メンバー一覧ページ
     - 組織メンバーをカード形式で表示
     - アバター、表示名、ロール、メールアドレスの表示
     - `next/image` の `Image` コンポーネントを使用（最適化）

3. **感謝送信機能の実装**
   - `src/actions/endorsement.ts` - 感謝送信Server Action
     - `endorseUserAction`: 感謝とスキルを送信
     - RPC関数 `endorse_user` を呼び出し
     - バリデーション、自分自身への送信チェック
     - キャッシュ更新（revalidatePath）
   - `src/lib/schema.ts` - バリデーションスキーマ追加
     - `endorsementSchema`: 感謝送信用のZodスキーマ
     - `EndorsementInput` 型のエクスポート追加
   - `src/components/ui/endorsement/send-dialog.tsx` - 感謝送信ダイアログ
     - メンバー選択（自分以外）
     - スキル名入力
     - メッセージ入力（任意）

4. **Shadcn UIコンポーネントの追加**
   - `dialog` - モーダルダイアログ
   - `select` - セレクトボックス
   - `textarea` - テキストエリア

#### バグ修正・コード品質改善

1. **不要なテキストの削除**
   - `src/app/slug/page.tsx` から説明文とコードブロック終了マーカーを削除

2. **TypeScript型エラーの修正**
   - `src/app/slug/layout.tsx`: 型アサーション追加 `org = organization as { id, name, slug }`
   - `src/app/slug/members/page.tsx`: 型アサーション追加 `org = organization as { id, name }`
   - `src/actions/endorsement.ts`: RPC関数に `@ts-expect-error` 追加

3. **ESLint警告の修正**
   - `src/app/slug/members/page.tsx`: `<img>` → `<Image />` (next/image) に変更

4. **暗黙的any型の修正**
   - `src/components/ui/endorsement/send-dialog.tsx`: `(val)` → `(val: string)` に変更

#### ファイル構成

```
src/
├── actions/
│   ├── auth.ts
│   ├── organization.ts
│   └── endorsement.ts (新規)
├── app/
│   ├── slug/
│   │   ├── layout.tsx (新規)
│   │   ├── page.tsx (新規)
│   │   └── members/
│   │       └── page.tsx (新規)
│   └── ...
├── components/
│   └── ui/
│       ├── endorsement/
│       │   └── send-dialog.tsx (新規)
│       ├── dialog.tsx (新規)
│       ├── select.tsx (新規)
│       ├── textarea.tsx (新規)
│       └── ...
└── lib/
    └── schema.ts (EndorsementInput追加)
```

#### 次のステップ

1. タイムライン表示の実装（感謝履歴の表示）
2. プロフィール編集機能の実装
3. 組織設定画面の実装
4. 招待コード発行機能の実装

## 2026-02-11

### ルーティング整理とミドルウェア・UI強化

#### 完了した作業

1. **組織スラッグルーティングの改善**
   - `src/app/slug/*` を削除し、動的セグメントディレクトリ `src/app/[slug]/` 配下にページを移動
   - 組織ホーム: `src/app/[slug]/page.tsx`
   - 組織レイアウト: `src/app/[slug]/layout.tsx`
   - メンバー一覧: `src/app/[slug]/members/page.tsx`
   - URL構造をNext.jsの推奨パターンに合わせつつ、これまでの機能（ログインチェック・メンバーシップチェック・サイドバー・メンバー一覧カード表示）を維持

2. **Supabaseミドルウェアの追加**
   - `src/lib/supabase/middleware.ts` を新規作成し、`createServerClient` を使ったセッション更新処理 `updateSession` を実装
   - `src/middleware.ts` で `updateSession` を呼び出す共通ミドルウェアを定義
   - 静的ファイルや画像を除くほぼ全てのリクエストでSupabaseセッションが適切に更新されるように設定

3. **タイムライン表示用UIコンポーネントの追加**
   - `src/components/ui/timeline/timeline-item.tsx` を追加し、感謝（endorsement）1件分を表示するカードコンポーネントを実装
   - 送信者・受信者のアバター／名前、スキルバッジ、メッセージ、相対時間（◯分前／◯日前など）を表示
   - `Avatar` と `Badge` コンポーネント（`src/components/ui/avatar.tsx`, `src/components/ui/badge.tsx`）を利用してShadcn UIと統一感のあるデザインに調整

4. **共通設定・依存パッケージの追加**
   - `tsconfig.json` に `"baseUrl": "."` を追加し、ルートからの絶対インポート設定を明示
   - 相対パス記述を減らし、パス解決の一貫性を向上
   - `date-fns` を依存ライブラリとして追加し、`formatDistanceToNow` と日本語ロケール(`ja`)を用いてタイムラインの相対時間表示を実装

#### 次のステップ

1. タイムライン一覧ページへの `TimelineItem` 組み込みと実データ連携
2. 組織設定画面・プロフィール編集画面からのナビゲーション導線整備
3. ミドルウェアの挙動確認（ログイン状態の切り替えやセッション有効期限まわり）