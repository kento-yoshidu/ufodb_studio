# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

`ufodb_studio`（UFO Studio。このリポジトリ、旧称`toy_ufdb_gui_app`／`tauri-scratch`）: `ufodb_v0`（オンメモリUnion-Find DB、別リポジトリ）をGUIから操作するためのTauri + React + TypeScriptアプリ。Tauri自体の学習も兼ねている。

- `ufodb_v0`とは別プロセスにしない。`src-tauri/Cargo.toml`で`ufodb_v0`をpath依存（`../../`）として追加し、TauriのRustバックエンドから`ufodb_v0::Ufdb`を直接呼び出す
- `ufodb_v0`本体の実装（コア機能・公開API）はこのリポジトリでは行わない。GUI側で必要になった公開APIが`ufodb_v0`に無い場合は、`ufodb_v0`側リポジトリで追加してもらう
- 永続化する。`ufodb_v0::storage`（CLI側のSAVE/LOADと同じ実装）をGUI側からも呼び出し、CLIと同じ保存データ(`./ufo_data/`配下)を共有する。ただし`storage`の保存先は現状カレントディレクトリ基準の相対パスなので、CLIとGUIで起動元（カレントディレクトリ）が異なると別ファイルを参照してしまう問題がある。これは`ufodb_v0`側でパス解決をcwd非依存にする対応が入るまでの既知の制約

実装計画・進捗のフェーズ分けは`docs/ROADMAP.md`、配布用のリリースビルド手順は`docs/RELEASE.md`を参照。

## コマンド

- `pnpm dev` — Viteのフロントエンド単体を起動（ポート1420固定）
- `pnpm tauri dev` — Tauriアプリとして起動（Rustバックエンド + フロントエンド）
- `pnpm build` — `tsc && vite build`（フロントエンドのビルド）
- `pnpm lint` — ESLint（`eslint.config.js`）。未使用の変数・引数は`tsc`ではなくここで警告として出す（`tsconfig.json`の`noUnusedLocals`/`noUnusedParameters`は無効化している）
- `pnpm tauri build` — Tauriアプリのビルド
- `cargo build` / `cargo test`（`src-tauri/`内で実行、または`cargo build --manifest-path src-tauri/Cargo.toml`）

## 構成・アーキテクチャ

- `src/App.tsx` — フロントエンド本体。`@tauri-apps/api/core`の`invoke()`でRust側のTauriコマンドを呼ぶ
- `src-tauri/src/lib.rs` — Tauriコマンド（`#[tauri::command]`）の実装本体。`tauri::State<Mutex<ufodb_v0::Ufdb>>`をアプリ全体で1つ`.manage()`し、各コマンドがロックして`Ufdb`を操作する
- `src-tauri/src/main.rs` — エントリポイント。`tauri_scratch_lib::run()`を呼ぶだけ
- 新しいTauriコマンドを追加する際は、関数に`#[tauri::command]`を付けるだけでなく`generate_handler![...]`（`lib.rs`の`run()`内）への登録が必要（登録漏れは既知の詰まりどころ）
- `groups`コマンドは代表元のusizeを返さずグループ（キー配列）のみを返す設計。これは`ufodb_v0`本体のFIND非公開方針に合わせたもの

## 関連リポジトリ

- `ufodb_v0`本体（オンメモリUnion-Find DB本体、CLI/REPL）はこのリポジトリの親ディレクトリ（`../../`）にあり、path依存で参照している。コア実装やCLI仕様の変更はそちら側の作業
- `ufodb-design-system`（`../design_system`）: UFO Playground（WASM版）と共有するReactコンポーネントとデザイントークン。`src/components/`のコンポーネントは順次そちらへ移す（`docs/ROADMAP.md`の「UI共通化」）。移した後のUIの変更は`ufodb-design-system`側で行う
  - 取り込み方: `package.json`で`link:../design_system`として参照し（ビルド済みの`dist/`を読む。design_system側で`pnpm build`し直せば再インストールなしで反映される）、`src/main.tsx`で`import "ufodb-design-system/style.css"`を1回だけ読み込む。`vite.config.ts`の`resolve.dedupe: ["react", "react-dom"]`は、`link:`先の`design_system/node_modules/react`が読まれてReactが二重になり、hooksがエラーになるのを防ぐためのもの。外さないこと

## 作業の進め方

このリポジトリの実装コード（`src/`・`src-tauri/src/`など）は基本的にユーザー自身が書く。ユーザーから明示的に依頼されない限り、実装コードを直接編集・作成しない。Claude Codeの役割は:

- 設計上の相談（Tauriコマンドの分割、状態管理の方針など）に応答する
- ユーザーが書いたコードのレビュー・指摘
- ドキュメント（`README.md` / `docs/ROADMAP.md` / `CLAUDE.md`）の作成・更新
- `cargo build` / `cargo test` / `pnpm build`などによるビルド・動作確認
