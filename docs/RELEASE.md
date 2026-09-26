# リリース手順

UFO Studio（このリポジトリ）をビルドして、インストーラーとして配布するまでの手順。現状はWindows向けの個人配布を前提にしている。インストーラーはGitHub Releasesに置き、GitHub Pagesの配布ページからリンクする（「配布の構成」を参照）。

> 2026-09-26にWindowsでビルド〜インストールまで確認済み（手順6の配布は未実施）。

## 前提

- `ufodb_v0`は`src-tauri/Cargo.toml`のpath依存（`{ path = "../../ufodb" }`）で参照している。ビルドするマシンには、このリポジトリと同じ親ディレクトリに`ufodb/`がチェックアウトされている必要がある
- Rust・pnpm・Tauriのビルド環境（Windowsの場合はMSVCビルドツールとWebView2）が揃っていること
- **インストーラーは、ビルドしたOS向けのものしか作れない**。Windows上のビルドで作れるのはWindows用だけ（macOS/Linux向けについては後述）

## 初回リリース前に一度だけ決めること

[`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json)の次の値。

| キー | 現在の値 | 用途・注意 |
|---|---|---|
| `productName` | `UFODB Studio` | インストーラーのファイル名、インストール先フォルダ名、スタートメニューの表示名になる |
| `app.windows[0].title` | `UFODB Studio` | ウィンドウのタイトルバー |
| `identifier` | `com.toriwatari.ufodb-studio` | **一度配布したら変えない**。インストーラーのアップグレード判定（同じアプリかどうか）や、Tauri側のアプリデータの保存先の決定に使われる。変えると別アプリ扱いになる。使える文字は英数字・ハイフン・ピリオドのみ（macOSのバンドルIDでは`_`が使えない） |

- [x] `identifier`を確定する

## 毎回のリリース手順

### 1. バージョンを上げる

次の3か所のバージョンを揃えて上げる。

- `src-tauri/tauri.conf.json`の`version`（インストーラーに表示されるのはこれ）
- `src-tauri/Cargo.toml`の`[package] version`
- `package.json`の`version`

### 2. `ufodb_v0`の状態を確認する

path依存なので、ビルドに使われるのは**その時点の`../../ufodb`の作業ツリー**になる。意図しない変更が入っていないか確認し、どのコミットでビルドしたかを控えておく。

```sh
git -C ../ufodb status
git -C ../ufodb log -1 --oneline
```

### 3. リリースビルド

このリポジトリのルートで実行する。

```sh
pnpm install
pnpm lint    # 任意。未使用の変数などを警告として確認する
pnpm build   # 先に型チェック（tsc）が通るか確認する
pnpm tauri build
```

開発中の`pnpm tauri dev`はViteの開発サーバーを動かすだけで`tsc`を実行しないため、型エラーがあっても気づかない。`pnpm tauri build`は型エラーがあると途中で止まるので、先に`pnpm build`で確認しておくと早い。

`beforeBuildCommand`（`pnpm build` = `tsc && vite build`）が先に走ってフロントエンドが`dist/`にビルドされ、Rust側のリリースビルドの後、インストーラーが作られる。

### 4. 成果物を確認する

`bundle.targets`が`"all"`なので、Windowsでは次の2種類が作られる。

- `src-tauri/target/release/bundle/nsis/<productName>_<version>_x64-setup.exe`（NSISのインストーラー。v0.1.0で約1.9MB）
- `src-tauri/target/release/bundle/msi/<productName>_<version>_x64_en-US.msi`（WiXのインストーラー。v0.1.0で約2.8MB）

`productName`が`UFODB Studio`なので、ファイル名は`UFODB Studio_0.1.0_x64-setup.exe`のようにスペースを含む。

配布するのはどちらか一方でよい。個人向けに配るなら`setup.exe`（NSIS）が扱いやすい。どちらか一方だけ作りたい場合は`pnpm tauri build --bundles nsis`のように指定する。

### 5. 動作確認

できれば開発環境とは別の、クリーンなWindows環境（別PCやVMなど）で確認する。

- インストーラーを実行してインストールできる
- 起動してグループ一覧が表示される
- データを追加して終了し、再起動しても残っている（保存先は後述）
- 前のバージョンが入っている環境で、上書きアップデートできる

### 6. 配布

GitHub Releasesにタグ（例: `v0.1.0`）を切り、インストーラーを添付する。リリースノートには、ビルドに使った`ufodb_v0`のコミットも書いておく。

配布ページのダウンロードボタンからリンクできるように、**バージョンを含まない固定名のコピー**（例: `ufodb-studio-setup.exe`）も同じリリースに添付する。詳細は次の「配布の構成」を参照。

## 配布の構成

| 置くもの | 置き場所 |
|---|---|
| インストーラー本体 | このリポジトリの**GitHub Releases** |
| 配布ページ（説明とダウンロードボタン） | **GitHub Pages**（どのリポジトリで公開するかは未定。下記参照） |

### インストーラーをGitHub Releasesに置く理由

- 無料で、容量・転送量を気にしなくてよい
- タグごとにバージョンが残り、リリースノートも書ける
- 将来`tauri-plugin-updater`を入れるとき、更新情報（`latest.json`）も同じ場所に置ける
- `tauri-apps/tauri-action`を使えば、CIでビルドからアップロードまで自動化できる

インストーラーはGitHub Pagesには置かない。Pagesにはサイト全体の容量（1GB）と転送量（月100GBが目安）の上限があり、バイナリの配布にも向いていないため。Pagesには配布ページだけを置き、ダウンロードボタンはReleasesへのリンクにする。

### 前提: リポジトリを公開する

- 非公開リポジトリのReleasesは、ログインしていない人がダウンロードできない
- 無料プランでGitHub Pagesを使えるのは、公開リポジトリだけ

非公開のままにする場合は、インストーラーの置き場所をCloudflare R2（転送料無料）やS3に変える必要がある。

### ダウンロードリンクのURL

GitHub Releasesには、常に最新リリースを指すURLがある。

```
https://github.com/kento-yoshidu/ufodb_studio/releases/latest/download/<ファイル名>
```

ただし、Tauriの成果物はファイル名にバージョンが入る（`<productName>_<version>_x64-setup.exe`）ため、このままではリンクを固定できない。対応は次のどちらか。

1. **固定名のコピーも添付する**（例: `ufodb-studio-setup.exe`）。配布ページのリンクを固定でき、いちばん簡単。当面はこちらで運用する
2. **配布ページがGitHub APIから最新リリースを取得する**（`GET /repos/kento-yoshidu/ufodb_studio/releases/latest`）。バージョン番号の表示や、macOS版などを追加したときの出し分けも自動にできる。ただし、認証なしのAPIには回数制限（1時間あたり60回/IP）がある。複数OSに配るようになったら検討する

### 配布ページをどこで公開するか（未定）

候補は次の2つ。

- **Playground（`ufo-playground`）のPagesに同居させる**（例: `/download`）。「ブラウザでPlaygroundを試す → 気に入ったらStudioをダウンロード」という流れにでき、`ufo-design-system`のコンポーネントもそのまま使える
- **配布ページ専用のリポジトリを作る**、またはこのリポジトリのPagesで公開する

どちらの場合も、次の点に注意する。

- `https://kento-yoshidu.github.io/<リポジトリ名>/`のようにサブパスで公開されるので、Viteの`base`をこのサブパスに合わせる（合わせないと、JS・CSS・`.wasm`の読み込みが404になる）。独自ドメインを設定するなら`base`は`/`のままでよい
- Playgroundと同居させる場合は、WASMのビルドとViteのビルドが必要になる。そのため、ビルド済みファイルをブランチにコミットする方式ではなく、GitHub Actionsでビルドして`actions/deploy-pages`で公開する

## 利用者の環境について

- **追加のインストールは不要**: `ufodb_v0`は実行ファイルに組み込まれている。フロントエンド（`dist/`）も実行ファイルに埋め込まれる
- **WebView2**: Windows 10/11には通常最初から入っている。入っていない環境では、NSISのインストーラーが既定の設定で自動的に取得する
- **保存データの場所**: `ufodb_v0::storage::data_dir()`（`directories::ProjectDirs`）が決めるので、起動した場所に関係なく`%LOCALAPPDATA%\ufodb\data\`になる。CLIの`ufodb_v0`と同じ場所なので、データを共有する。アンインストールしてもこのフォルダは消えない

## 既知の制約・今後の課題

### コード署名

未署名のインストーラーをダウンロードして実行すると、Windows SmartScreenの「WindowsによってPCが保護されました」が表示される。「詳細情報 → 実行」で起動できるが、利用者には案内が必要。警告を消すにはコード署名証明書（有料）で署名する必要がある。

### macOS / Linux向けの配布

- 各OSのマシン上でビルドする必要がある。GitHub Actionsと`tauri-apps/tauri-action`を使って、各OSのランナーでビルドするのが定番
- CIでビルドする場合、path依存の`../../ufodb`も同じ配置でチェックアウトする必要がある（`ufodb_v0`をgit依存にするかどうかも含めて要検討）
- macOSは、Apple Developer Program（年$99）で署名と公証をしないと、「壊れているため開けません」と表示されて、ほぼ起動できない

### 配布物のサイズ

`ufodb_v0`のfeature分割が未実装なので、Studioの実行ファイルにもCLI用の依存（`clap`/`tiny_http`/`open`）が含まれている。動作に問題はないが、feature分割後に`default-features = false, features = ["storage"]`で参照するように変えれば、その分だけ小さくなる。

### 自動アップデート

未導入。入れる場合は`tauri-plugin-updater`を使う。アップデート用の署名鍵の生成と、更新情報（`latest.json`）を置く場所（GitHub Releasesなど）が必要になる。
