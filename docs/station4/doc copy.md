# 設計2

ここにマークダウン形式のテキストやリンクを記載する。
※リンクの場合は、リンクを知っている全員が閲覧できるように権限設定してください。

1. API & バリデーション設計
1.1 設計方針
APIアーキテクチャ: Next.js Server Actionsを採用。RESTエンドポイントではなく、関数として呼び出す。
型安全性: TypeScriptにより、Input/Outputの型を厳格に定義する。
バリデーション: zod ライブラリを使用し、フロントエンド（React Hook Form）とバックエンド（Server Actions）でスキーマを共有する「Isomorphic Validation」を行う。
1.2 バリデーションスキーマ (Zod Definition)
src/lib/schema.ts に実装する定義。
共通定義
import { z } from 'zod';

export const userIdSchema = z.string().uuid({ message: "無効なユーザーID形式です" });


プロフィール (Profiles)
export const profileSchema = z.object({
  display_id: z
    .string()
    .min(3, { message: "IDは3文字以上で入力してください" })
    .max(20, { message: "IDは20文字以内で入力してください" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "半角英数字とアンダースコアのみ使用可能です" }),
  
  display_name: z
    .string()
    .min(1, { message: "表示名は必須です" })
    .max(50, { message: "表示名は50文字以内で入力してください" }),
  
  tagline: z
    .string()
    .max(100, { message: "肩書きは100文字以内で入力してください" })
    .optional(),
  
  bio: z
    .string()
    .max(1000, { message: "自己紹介は1000文字以内で入力してください" })
    .optional(),
  
  avatar_url: z
    .string()
    .url({ message: "有効なURL形式ではありません" })
    .optional()
    .or(z.literal("")), // 空文字による削除を許容
});

export type ProfileInput = z.infer<typeof profileSchema>;


スキルタグ (Skills)
// カテゴリのEnum定義（基本設計書準拠）
export const skillCategoryEnum = z.enum(['frontend', 'backend', 'design', 'other']);

// スキル単体更新・作成用
export const skillTagSchema = z.object({
  id: z.string().uuid().optional(), // 新規作成時はundefined
  name: z
    .string()
    .min(1, { message: "スキル名は必須です" })
    .max(30, { message: "スキル名は30文字以内で入力してください" }),
  category: skillCategoryEnum,
  score: z.number().int().min(1).max(5).default(1),
});

// 並び替え用
export const reorderSkillsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    display_order: z.number().int().min(0),
  })
);

export type SkillTagInput = z.infer<typeof skillTagSchema>;


1.3 Server Actions インターフェース定義
src/actions/ 配下に配置される関数群。
共通レスポンス型
すべてのActionは以下の型を返却する。
type ActionResponse<T = null> = {
  success: boolean;
  message?: string;                 // トースト表示用メッセージ
  data?: T;                         // 成功時のデータペイロード
  errors?: Record<string, string[]>; // フィールド別エラー（バリデーション用）
  errorCode?: string;               // クライアント制御用エラーコード
};


プロフィール関連 (actions/profile.ts)
updateProfile
ユーザー自身のプロフィール情報を更新する。
Input: ProfileInput
Output: ActionResponse<ProfilesRow>
Error Handling: display_id 重複時 -> errors: { display_id: ["このIDは既に使用されています"] }
uploadAvatar
アバター画像をStorageにアップロードし、公開URLを取得する。
Input: FormData (key: "file")
Output: ActionResponse<{ publicUrl: string }>
Validation:
File Type: image/jpeg, image/png, image/webp
File Size: Max 2MB
スキル関連 (actions/skill.ts)
upsertSkill
スキルの新規追加または既存更新を行う（IDの有無で判定）。
Input: SkillTagInput
Output: ActionResponse<SkillsRow>
Permissions: RLSにより所有者のみ実行可能。
deleteSkill
指定したスキルを削除する。
Input: skillId: string
Output: ActionResponse<null>
updateSkillOrder
ドラッグ＆ドロップによる並び順の一括保存。
Input: { id: string, display_order: number }[]
Output: ActionResponse<null>
Logic:
トランザクション処理推奨（Supabase RPCまたはClient LibraryのChain）
渡されたIDリストが全て自身の所有物か検証
1.4 DB制約 (Database Constraints)
アプリケーション層のバリデーションをすり抜けた場合の最終防衛ライン。


テーブル
カラム
制約内容
備考
profiles
display_id
UNIQUE
重複禁止
profiles
display_id
CHECK (char_length(display_id) >= 3)
3文字以上
skills
score
CHECK (score BETWEEN 1 AND 5)
1~5の範囲
skills
category
CHECK (category IN ('frontend',...))
アプリ側Enumと同期

2. 例外仕様 & システム回復手順
2.1 例外処理方針 (Error Handling Policy)
エラーレベル定義
レベル
定義
通知先
ユーザーへの振る舞い
FATAL
システム停止、重要データの不整合
Sentry + Slack通知
エラー画面 (500 Page) またはメンテナンス画面
ERROR
処理失敗、継続利用可能
Sentry
エラートースト/モーダル表示
WARN
入力ミス、権限不足、バリデーション
(Client Log)
フォームのエラーメッセージ、警告トースト
INFO
正常な処理フロー上の通知
-
成功トースト、インフォメーション

フロントエンド表示ルール
Global Error Boundary: 予期せぬレンダリングエラーをキャッチし、「再読み込み」ボタン付きのエラーコンポーネントを表示。
Toast (Sonner/Hot-toast): API呼び出しの結果（成功/失敗）を右下に通知。
Form Validation: 入力フィールド直下に赤文字で具体的に表示。
2.2 具体的な例外パターンと処理
認証・認可 (Auth & Permission)
ケース
ステータス
エラーコード
メッセージ (JA)
処理フロー
未ログインアクセス
401
UNAUTHORIZED
(なし)
Middlewareにより /login へリダイレクト
権限不足 (RLS)
403
FORBIDDEN
この操作を行う権限がありません。
処理中断、エラーログ送信 (不正アクセスの可能性)
セッション切れ
401
SESSION_EXPIRED
セッションが切れました。再度ログインしてください。
ログイン画面へ誘導

データ操作 (Data Operation)
ケース
ステータス
エラーコード
メッセージ (JA)
処理フロー
ID重複 (Profile)
409
CONFLICT
そのIDは既に使用されています。
入力フォーム display_id にエラー紐づけ
レコード不在
404
NOT_FOUND
対象のデータが見つかりません。
404ページ表示 または 一覧へリダイレクト
楽観的ロック競合
409
VERSION_CONFLICT
データが他で更新されました。リロードしてください。
最新データを再取得して表示更新

システム・インフラ (System)
ケース
エラーコード
メッセージ (JA)
処理フロー
タイムアウト
TIMEOUT
処理がタイムアウトしました。通信環境を確認してください。
リトライボタンを表示
ストレージ容量超過
STORAGE_FULL
画像サイズが大きすぎるか、容量制限を超えています。
アップロード中断
予期せぬエラー
INTERNAL_SERVER_ERROR
システムエラーが発生しました。時間を置いて再試行してください。
Sentryへスタックトレース送信

2.3 システム回復手順 (Disaster Recovery)
データベース障害・データ消失
シナリオ: 誤ったSQL実行によるデータ削除、またはデータの破損。
影響範囲の特定: 管理者用ダッシュボードまたはSQLログより、影響を受けたテーブルと時刻を特定。
Point-in-Time Recovery (PITR) の実行: (Proプラン以上) 障害発生の5分前の日時を指定してリストアを実行。※サービス停止が発生する。
復旧確認: アプリケーションからデータが参照できるか確認。
デプロイ障害 (Bad Deployment)
シナリオ: 本番デプロイ後に画面が真っ白になる、APIが500エラーを連発する。
即時ロールバック: Vercel Dashboard > Deployments > 直近の正常デプロイ > "Rollback" をクリック。
原因究明と修正: 手元で現象を再現させ、修正パッチを作成し再度デプロイ。
外部サービスダウン (Supabase/Auth)
シナリオ: Supabaseの障害によりログインやDB接続ができない。
メンテナンスモードへ切り替え: Vercel Env NEXT_PUBLIC_MAINTENANCE_MODE = "true" に設定しRedeploy。
復旧待機: Supabase Status Pageを確認。
サービス再開: 環境変数を削除し、Redeploy。
2.4 ログ監視運用
監視ツール: Sentry (Application Error), Supabase Logs (Database/Auth)
アラート条件: 500エラー率 > 1% または DB CPU > 80%
3. テスト設計
3.1 テスト戦略
Unit Test (単体): ユーティリティ関数、複雑なバリデーションロジック、UIコンポーネント単体。
Integration Test (結合): Server ActionsとDBの連携、認証フローを含むページ遷移。
E2E Test (主要フロー): ユーザー登録〜プロフィール作成〜スキル登録の一連の流れ（Playwright等の導入は任意、まずは手動テスト重点）。
3.2 機能別テストケース一覧
認証・オンボーディング (Auth & Onboarding)
ID
区分
テストケース名
前提条件
操作・入力手順
期待値 (Expected Result)
AUTH-01
正常
新規サインアップ (Email)
未ログイン
メアド・パスワード入力 -> 登録
確認メール送信画面へ遷移。Supabase auth.users にレコード作成。
AUTH-02
正常
メール確認完了
メール受信済
メール内リンクをクリック
ログイン状態でオンボーディング画面 (Profile初期設定) へ遷移。
AUTH-03
異常
登録済みメアド
登録済み
既存メアドでサインアップ試行
エラーメッセージ「既に登録されています」表示。
AUTH-04
異常
パスワードポリシー違反
未ログイン
5文字以下のパスワード入力
バリデーションエラー「6文字以上必要です」。
AUTH-05
正常
ログアウト
ログイン中
ヘッダーのログアウト押下
LPまたはログイン画面へ遷移。セッション破棄。

プロフィール管理 (Profile)
ID
区分
テストケース名
前提条件
操作・入力手順
期待値 (Expected Result)
PROF-01
正常
基本情報更新
ログイン済
表示名、Bio等を変更し「保存」
DB更新成功、トースト通知、画面に反映。
PROF-02
異常
必須項目削除
ログイン済
表示名を空にして「保存」
クライアントバリデーションでエラー表示。送信されない。
PROF-03
異常
ID重複チェック
ログイン済
他ユーザーのIDを入力し「保存」
サーバー側で409エラー。フォームに「使用されています」表示。
PROF-04
正常
アバター画像アップロード
ログイン済
2MB以下のPNGを選択
アップロード成功、プレビュー更新、DBにURL保存。
PROF-05
異常
画像サイズ超過
ログイン済
5MB以上の画像を選択
アップロード前にエラー「2MB以下のファイルを選択してください」。
PROF-06
表示
公開ページ閲覧 (SSR)
未ログイン
/username にアクセス
OGPタグが出力され、該当ユーザーの情報が表示される。

スキルタグ管理 (Skill Management)
ID
区分
テストケース名
前提条件
操作・入力手順
期待値 (Expected Result)
SKIL-01
正常
スキル追加
ログイン済
名前"React", スコア"5"で追加
リストに即時反映。DB skills テーブルに追加。
SKIL-02
正常
スキル削除
スキル所持
ゴミ箱アイコン押下 -> 確認OK
リストから消失。DBから削除 (物理削除)。
SKIL-03
正常
並び替え (D&D)
複数スキル所持
ドラッグして順序入替 -> 保存
リロード後も順序維持。DB display_order が更新されている。
SKIL-04
異常
上限数テスト
49個所持
50個目を追加 -> 51個目を追加
50個目は成功。51個目はエラー「登録上限に達しました」(仕様による)。
SKIL-05
Security
他人データ操作
API直接叩く
他人の user_id でスキル追加リクエスト
RLSポリシー違反により 403 エラー。

3.3 ブラウザ・デバイスカバレッジ
PC: Chrome (Latest), Safari, Firefox
Mobile: iOS Safari (iPhone SE/13), Android Chrome
レスポンシブ:
375px (Mobile)
768px (Tablet)
1024px~ (Desktop)
確認事項:
モバイルでのドロワーメニュー動作
モバイルでのドラッグ＆ドロップ操作性 (dnd-kitのタッチ対応)
