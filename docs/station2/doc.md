# 要件定義

ここにマークダウン形式のテキストやリンクを記載する。
※リンクの場合は、リンクを知っている全員が閲覧できるように権限設定してください。

プロダクト名： Skilltag

1. プロダクト概要 (Executive Summary)

1.1 背景と課題 (The Problem)

現代の組織、特にプロジェクトベースで動くチームにおいて、以下の課題が顕著である。

「隠れた貢献」の埋没: 日常的なサポート、技術的な相談、ドキュメント整備などの「役職に付かない貢献」が可視化されず、評価やモチベーション低下に繋がっている。

スキル情報の属人化: 「誰が何を得意としているか」が可視化されておらず、適切なアサインや相談相手探しにコストがかかる。

既存ツールの形骸化: 一般的なタレントマネジメントシステムは入力負荷が高く、データが陳腐化しやすい。

1.2 製品ビジョン・ソリューション (The Solution)

「称賛が、そのままスキルマップになる。」

従業員同士が日々の感謝（称賛）を送り合うことで、自然と組織内のスキルデータが蓄積されるボトムアップ型のタレントマネジメントSaaS。

Input: 組織に参加したメンバー同士が、感謝とスキルタグを送る。

Output: 蓄積されたデータから、組織の「リアルタイムなスキルマップ」を生成する。

Structure: 1人のユーザーが複数の組織（ワークスペース）に所属できるマルチテナント型アーキテクチャ。

1.3 ターゲットユーザー

メインユーザー: 成長企業のエンジニア、デザイナー、PMなどの現場メンバー。

組織管理者: チームビルディングを強化したいマネージャー、リーダー。

2. 開発スコープと前提 (Scope & Assumptions)

2.1 開発フェーズ

Phase 1 (MVP): コア機能（組織作成、感謝送信、スキル可視化）の実装。

Phase 2 (Planned): 分析機能、Slack連携、部署詳細管理など。

2.2 アーキテクチャ方針

マルチテナント (SaaS型): ユーザーアカウントはグローバルに存在し、複数の「組織（Organization）」を行き来できる設計とする。

データ分離: 組織ごとのデータ（感謝メッセージ、メンバー情報）は厳格に分離し、他組織からはアクセスできないようにする（RLSによる制御）。

3. 機能要件 (Functional Requirements)

3.1 認証とオンボーディング (Auth & Onboarding)

FR-01: ユーザー登録 (Sign Up / Login)

Email/Password による個人アカウント作成。

Google Auth などのソーシャルログイン（将来的な拡張を考慮）。

登録完了後、自動的にログイン状態とする。

FR-02: 組織選択フロー (Organization Selection)
初回ログイン時（オンボーディング）および設定画面から、以下のいずれかのアクションを選択できる。

組織に参加する: 既存組織の招待コードを入力して参加する。

組織を新規作成する: 組織名とスラッグ（URL ID）を決めて、新しいワークスペースを作成する。

3.2 組織内機能 (In-Organization Features)

※ ユーザーは特定の組織コンテキスト（/[org_slug]/）に入った状態で以下の機能を利用する。

FR-03: ダッシュボード (Timeline)

組織内の全メンバーの感謝メッセージ（Endorsements）をタイムライン形式で表示する。

自分の受信履歴、送信履歴を確認できる。

FR-04: 感謝とスキルの送信 (Endorse)

宛先選択: 同じ組織内のメンバーから検索して選択。

スキルタグ (Skill Tags): 称賛したいスキル（例: #Python, #Mentoring）。新規作成または既存タグからのサジェスト。

メッセージ: 具体的な感謝の内容。

FR-05: メンバーリスト & スキル検索 (Member Directory)

組織内のメンバー一覧を表示。

フィルタリング: スキルタグによる絞り込み（例: 「#React」が得意な人を探す）。

部署フィルタ: （実装準備中）部署による絞り込み。

FR-06: ユーザープロフィール (Profile)

アバター、表示名、自己紹介の表示。

スキルバッジ: 獲得したスキルと、その獲得数（Endorsement Count）の表示。

アバター画像は外部サービス（UI Avatars等）を利用し、アップロード機能はMVPでは実装しない。

3.3 設定・管理機能 (Settings & Admin)

FR-07: 組織切り替え (Organization Switcher)

所属している複数の組織をサイドバー等のメニューから瞬時に切り替えることができる。

FR-08: 組織管理 (Organization Admin)

招待コード管理: メンバーを招待するためのコード発行・確認。

メンバー管理: 組織内のメンバー一覧確認と、除名（Remove）処理。

※ 組織作成者が自動的に「Owner」権限を持つ。

4. データモデル概要 (Data Model)

Supabase (PostgreSQL) を採用。基本設計書 v2.0 に準拠。

テーブル名

説明

主要カラム

users

ユーザー基本情報（Global）

id (auth.uid), email, display_name, avatar_url

organizations

組織（テナント）

id, name, slug (Unique URL Identifier)

organization_members

所属情報（中間テーブル）

organization_id, user_id, role (owner/member)

departments

部署マスタ

id, organization_id, name

skills

スキルタグマスタ

id, name (Unique)

user_skills

ユーザーごとのスキル獲得数

user_id, skill_id, endorsement_count

endorsements

感謝メッセージ（トランザクション）

sender_id, receiver_id, skill_id, message, organization_id

invitations

招待コード

organization_id, code, is_active

※ departments 機能については、DBテーブルは定義するが、MVPでのUI実装（ユーザーへの紐付け等）は優先度低とするか、開発期間に余裕があれば実装する。

5. 非機能要件 (Non-Functional Requirements)

レスポンス速度: Server Actions と Optimistic UI を活用し、体感速度を向上させる。

セキュリティ: Supabase RLS (Row Level Security) を徹底し、異なる組織のデータが見えないように制御する。

拡張性: 将来的なモバイルアプリ化やAPI連携に耐えうるDB設計とする。