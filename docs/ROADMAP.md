# toy_ufdb_gui_app ロードマップ

`ufodb_v0`(オンメモリUnion-Find DB、別リポジトリ)をCargo依存として直接embedするTauriアプリ。GUIからUFQL相当の操作を行えるようにする。Tauri自体の学習も兼ねているため、まずは単一プロセス・単一DBの範囲で進める。

## 前提・スコープ

- `ufodb_v0`とは別プロセスにしない。TauriのRustバックエンド内で`ufodb_v0::Ufdb`(将来的には`ufodb_v0::db::Db`)を直接呼び出す。CLIの`cargo run`とデータを共有する必要はない(詳細は`ufodb_v0`側`docs/ROADMAP.md`の「GUI(Tauri、別リポジトリ)との連携メモ」を参照)
- `ufodb_v0`本体の実装はこのリポジトリでは行わない。GUI側で必要になった公開APIが`ufodb_v0`に無い場合は、そちらのリポジトリ側で追加してもらう(Phase 4参照)
- 永続化する。`ufodb_v0::storage`(CLI側のSAVE/LOADと同じ実装)をGUI側からも呼び出し、CLIと同じ保存データ(`./ufo_data/`配下)を共有する方針に変更した(詳細はPhase 5参照)

## Phase 0: プロジェクト初期化
- [x] `npm create tauri-app`でReact + TypeScript + Vite構成のTauriプロジェクトを作成
- [x] 独立したgitリポジトリとして管理し、`toy_ufdb_gui_app`にリモートを設定
- [x] `ufodb_v0`をCargo依存として`src-tauri/Cargo.toml`にpath指定で追加(`{ path = "../../" }`)

## Phase 1: 疎通確認
- [x] 引数なし・状態なしの最小コマンド(`health`)を実装し、`ufodb_v0::Ufdb::new()`を呼んだ結果がフロントまで返ることを確認
- [x] `generate_handler![...]`への登録漏れで`invoke`が失敗するケースを経験（コマンドは実装するだけでなく登録が必要）

## Phase 2: 単一DBの基本操作をGUI化
現時点では`tauri::State<Mutex<ufodb_v0::Ufdb>>`をアプリ全体で1つ`.manage()`し、各コマンドがロックして操作する構成（`Db`層はPhase 3で導入）。

- [x] `make_set`(INSERT相当): キー入力フォーム→ボタンで登録。登録後に`groups`を再取得して画面を更新
- [x] `groups`(GROUPS相当): 起動時(`useEffect`)に取得して一覧表示。「森」として、代表元のusizeは返さずグループの配列のみ返す（`ufodb_v0`本体のFIND非公開方針に合わせた設計）
- [ ] `unite`(MERGE相当): 2つのキーを指定して統合するフォーム
- [ ] `same`(SAME相当): 2つのキーが同じグループか判定して表示
- [ ] `size`(SIZE相当): 1つのキーが属するグループのサイズを表示。存在しないキーの場合の表示（`None`）も考慮
- [ ] `unmerge`(UNMERGE相当): 2つのキーの辺を取り消すフォーム
- [ ] `seed`(SEED相当): 固定ダミーデータを投入するボタン。CLI版にある「既存データがある場合の確認」をGUIでどう表現するか（確認ダイアログ／単純に上書きなど）は実装時に決める
- 設計判断ポイント（実装しながら決める）: 各操作のたびに`groups`を呼び直して全体を再取得する今のやり方は、キー数が増えると無駄が大きくなる可能性がある。差分更新にするか、しばらくはシンプルさ優先で全件再取得のままにするかは、実際にもたつきを感じてから検討する

## Phase 3: 複数DB対応（`Db`層への切り替え）
`ufodb_v0`本体はPhase 5で`Ufdb`を`Db`（`HashMap<String, Ufdb>` + `current_db`）でラップする2層構成にしている。GUI側もこれに合わせて`CREATEDB`/`USE`相当の操作を追加する。

- [ ] 管理する状態を`Mutex<ufodb_v0::Ufdb>`から`Mutex<ufodb_v0::db::Db>`に切り替える。各コマンドは`db.current()`経由で`Ufdb`を触る形にRust側を書き換える（既存の`make_set`/`groups`などのコマンド実装もこの型変更に追従が必要）
- [ ] `create_db`(CREATEDB相当): DB名を指定して作成、かつそのDBに切り替え
- [ ] `use_db`(USE相当): 既存DB名に切り替え。存在しない場合の挙動（CLI版はy/n確認）をGUIでどう表現するか検討
- [ ] 現在選択中のDB名を画面のどこかに常時表示する（複数DBを行き来できるようになるため、「今どこを見ているか」が分からなくなるのを防ぐ）
- 設計判断ポイント: DB切り替え時、画面の`groups`表示は自動的に切り替え後のDBの内容に更新されるべき（`use_db`/`create_db`呼び出し直後に`groups`を再取得する、という規約をPhase 2の各操作と揃える）

## Phase 4: グラフ可視化（ufodb_v0 ROADMAP Phase 11相当、GUI側の責務）
`ufodb_v0`本体のROADMAP.mdでは「動的な更新・編集・インタラクティブな表示はTauriアプリ側の責務」と明記されている。ここがその実装にあたる。

- [ ] **前提となるブロッカー**: 現状の`ufodb_v0::Ufdb`は内部の`graph`（実際にMERGEされた辺の一覧）を外部に公開するメソッドを持たない。可視化には「どのキーとどのキーが辺で繋がっているか」のデータが要るため、`ufodb_v0`本体に`pub fn edges(&self) -> ...`のような公開APIを追加してもらう必要がある（このリポジトリでは実装しない。`ufodb_v0`側での対応待ち）
- [ ] 辺データが取得できるようになったら、フロント側でグラフを描画する（DOM/SVG/canvasのどれを使うかは実装時に決める。ufodb_v0側の静的HTML出力（Phase 11）とは異なり、こちらは操作するたびにインタラクティブに再描画できるのが狙い）
- [ ] ノードをクリックしたら、そのキーを起点に`same`/`size`などを呼べるようにする、といったインタラクション（詳細は実装時に検討）
- [ ] 大規模グループの扱い（`ufodb_v0`側ROADMAP Phase 11と同様、閾値を超えたグループはレイアウト計算を諦めて簡易表示にする）をどこまでこちらでも踏襲するかは、実際に大きいデータで試してから決める

## Phase 5: 永続化対応（SAVE/LOAD）
`ufodb_v0`側で永続化（Phase 12、`ufodb_v0::storage`として`pub mod storage;`済み）が実装されたのを受けて、GUI側もCLIと同じ保存データを扱えるようにする。

- [ ] **前提となるブロッカー**: `ufodb_v0::storage`の保存先(`./ufo_data/{db_name}.json`)はカレントディレクトリ基準の相対パス。CLI(`ufodb`リポジトリ直下で起動)とGUI(`tauri-scratch/src-tauri`から起動されることが多い)では起動元が異なるため、同じ相対パスでも別のファイルを見てしまう。`ufodb_v0`側でcwdに依存しない保存先解決に直してもらう必要がある（このリポジトリでは対応しない）
- [ ] `save`コマンド: `ufodb_v0::storage::save(&ufdb, db_name)`を呼ぶTauriコマンドを追加。`io::Error`は`Serialize`を実装していないため、戻り値は`Result<(), String>`等に変換する
- [ ] 起動時のロード: `run()`内で`Mutex::new(ufodb_v0::Ufdb::new())`の代わりに、`ufodb_v0::storage::load(db_name)`の結果があればそれを使う形に変更する
- [ ] `db_name`の扱い: 現状GUIは`Db`層（複数DB対応、Phase 3）を持たず単一の`Ufdb`のみのため、`db_name`は当面決め打ち文字列（CLIのデフォルト`"ufdb"`と合わせる）にする。Phase 3実装後は選択中のDB名と連動させる

## 検討事項（未定）
- CLIプロセスと生きたデータを共有したくなった場合の話（TCPサーバー化）は`ufodb_v0`側ROADMAP.mdの「検討事項: TCPサーバー化」を参照。現時点では着手予定なし
