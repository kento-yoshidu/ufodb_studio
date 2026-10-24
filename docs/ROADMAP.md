# UFO Studio（ufodb_studio）ロードマップ

`ufodb_v0`(オンメモリUnion-Find DB、別リポジトリ)をCargo依存として直接embedするTauriアプリ。GUIからUFQL相当の操作を行えるようにする。Tauri自体の学習も兼ねているため、まずは単一プロセス・単一DBの範囲で進める。

## 前提・スコープ

- `ufodb_v0`とは別プロセスにしない。TauriのRustバックエンド内で`ufodb_v0::Ufdb`(将来的には`ufodb_v0::db::Db`)を直接呼び出す。CLIの`cargo run`とデータを共有する必要はない(詳細は`ufodb_v0`側`docs/ROADMAP.md`の「GUI(Tauri、別リポジトリ)との連携メモ」を参照)
- `ufodb_v0`本体の実装はこのリポジトリでは行わない。GUI側で必要になった公開APIが`ufodb_v0`に無い場合は、そちらのリポジトリ側で追加してもらう(Phase 4参照)
- 永続化する。`ufodb_v0::storage`(CLI側のSAVE/LOADと同じ実装)をGUI側からも呼び出し、CLIと同じ保存データ(`./ufo_data/`配下)を共有する方針に変更した(詳細はPhase 5参照)

## Phase 0: プロジェクト初期化
- [x] `npm create tauri-app`でReact + TypeScript + Vite構成のTauriプロジェクトを作成
- [x] 独立したgitリポジトリとして管理し、`toy_ufdb_gui_app`にリモートを設定（のちに`ufodb_studio`へリネーム）
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

## UI共通化（`ufodb-design-system`の導入）
UFO Playground（WASM版）と同じUIにするため、`src/components/`のコンポーネントを`ufodb-design-system`（`../design_system`）に移し、そこから読み込む形にする。Phase 2と並行して進める。進め方の全体は`ufodb-design-system`側の`docs/ROADMAP.md`を参照。

まずテスト用のダミーコンポーネントで、別リポジトリのパッケージを読み込む仕組みが動くかだけを確認する。Studioはすでに動いているので、変わるのはUIの読み込み元だけになり、問題が出たときに原因を絞り込みやすい（Playgroundより先にStudioで確認する）。

- [x] `package.json`で`ufodb-design-system`を`link:../design_system`で参照する
- [x] `vite.config.ts`に`resolve.dedupe: ["react", "react-dom"]`を入れる。`link:`で参照すると、ライブラリ内の`import "react"`が`design_system/node_modules/react`を読みにいき、Reactが二重に読み込まれることがある
- [x] `import "ufodb-design-system/style.css"`を入れる（`src/main.tsx`）
- [x] ダミーコンポーネントを画面のどこかに仮置きし、確認する（`src/App.tsx`）:
  - [x] `pnpm tauri dev`で表示され、ボタンを押すと数字が増える（hooksが動く = Reactが1つだけ読み込まれている）
  - [x] CSS Modulesのスタイルと、CSS変数（デザイントークン）が効いている
  - [ ] エディタでpropsの型補完が効く
  - [x] `pnpm tauri build`でも同じように表示される（ビルドしたインストーラーでWindowsにインストールし、`useState`の動作も含めて確認済み）
- [ ] 確認が済んだらダミーコンポーネントを外し、`ufodb-design-system`に移したものから順に差し替える（`Header` → グループ一覧 → `SidePanel`）。差し替えたコンポーネントは`src/components/`から削除する（切り出し後は`ufodb-design-system`側を正とする）
- [ ] `Contents.tsx`は`invoke()`の呼び出しと画面の組み立てが混ざっているので、`invoke()`の呼び出し（状態管理）だけをStudio側に残し、見た目は共有コンポーネントを並べるだけの形にする
- [ ] テーマをダーク固定にする（ライト/ダークの切り替えはしない。方針の詳細は`ufodb-design-system`側`docs/ROADMAP.md`のPhase 2「デザイントークンとグローバルなスタイル」）。`src/App.css`のトークンを`ufodb-design-system`へ移せば、CSS側（`:root`のダークの値・`color-scheme: dark`）はそちらで入る。Studio側で行うのは次の2つ:
  - `src-tauri/tauri.conf.json`の`app.windows[0]`に`backgroundColor`（`--bg`と同じ色）を指定する。WebViewはCSSが読み込まれるまで白いので、指定しないと起動直後に白くちらつく
  - 同じく`"theme": "Dark"`を指定する。WindowsのタイトルバーはOSのテーマに従うため、OSがライトモードだとタイトルバーだけ白くなる

## Phase 3: 複数DB対応（`Db`層への切り替え）
`ufodb_v0`本体はPhase 5で`Ufdb`を`Db`（`HashMap<String, Ufdb>` + `current_db`）でラップする2層構成にしている。GUI側もこれに合わせて`CREATEDB`/`USE`相当の操作を追加する。

- [ ] 管理する状態を`Mutex<ufodb_v0::Ufdb>`から`Mutex<ufodb_v0::db::Db>`に切り替える。各コマンドは`db.current()`経由で`Ufdb`を触る形にRust側を書き換える（既存の`make_set`/`groups`などのコマンド実装もこの型変更に追従が必要）
- [ ] `create_db`(CREATEDB相当): DB名を指定して作成、かつそのDBに切り替え
- [ ] `use_db`(USE相当): 既存DB名に切り替え。存在しない場合の挙動（CLI版はy/n確認）をGUIでどう表現するか検討
- [ ] 現在選択中のDB名を画面のどこかに常時表示する（複数DBを行き来できるようになるため、「今どこを見ているか」が分からなくなるのを防ぐ）
- 設計判断ポイント: DB切り替え時、画面の`groups`表示は自動的に切り替え後のDBの内容に更新されるべき（`use_db`/`create_db`呼び出し直後に`groups`を再取得する、という規約をPhase 2の各操作と揃える）

## Phase 4: グラフ可視化（ufodb_v0 ROADMAP Phase 11相当、GUI側の責務）
`ufodb_v0`本体のROADMAP.mdでは「動的な更新・編集・インタラクティブな表示はTauriアプリ側の責務」と明記されている。ここがその実装にあたる。

ufodb_v0側の静的HTML出力（Phase 11）とは異なり、こちらは操作するたびにインタラクティブに再描画できるのが狙い。グループ一覧（row表示）とグラフ（graph表示）を切り替えて使う。

### グラフデータの取得
- [x] `graph`コマンド: `{ nodes: string[], edges: { source, target }[] }`の形（Rust側は`GraphData`/`Edge`構造体）でフロントに返す。`nodes`はソート済みで、どの辺にも出てこない孤立ノード（INSERTしただけのキー）も含む
  - 当初は「`ufodb_v0`が辺の一覧を公開していない」ことをブロッカーとしていたが、`Ufdb::neighbors(key)`が公開されたため、Studio側だけで組み立てられるようになった。`groups()`で全キーを集め → 各キーの`neighbors()`を見て → `key < neighbor`の組だけ残す（内部の隣接リストは同じ辺をa側・b側の両方に持っているため）
  - `unite`は既に同じグループなら辺を追加しないので、グラフは必ず森（ループのない木の集まり）になる
- [ ] 組み立て処理は`ufodb_v0`本体の`Ufdb::edges()`（追加予定。`ufodb_v0`側`docs/ROADMAP.md`の「Web Playground（WASM、別リポジトリ）との連携メモ」）ができたら、その呼び出しに置き換える。Playgroundでも同じ処理が要るため、本体に持たせる。フロントに返す形は変えない（フロント側の書き直しが不要になるように）
- [ ] フロント側の`GraphData`型は、`Groups`と同様に`ufodb-design-system`からexportする形にする（現状は`Contents.tsx`内で定義している）。Rust側の構造体とは手で揃える必要がある

### 表示の切り替え
- [x] row/graphの切り替えボタンを仮置きする（`Contents.tsx`。design-systemの`Button`を使用）。表示領域の枠（`.right`）は条件分岐の外に出し、中身だけを入れ替える
- [ ] row表示（design-systemの`Groups`）とgraph表示は別コンポーネントに分ける。graph表示も`ufodb-design-system`側に作り（Playgroundと共有するため）、`invoke()`は呼ばずにデータはprops・操作はコールバックで受け渡す。データ取得とmodeの管理はStudio側の`Contents`に残す
- [ ] 仮置きのボタンを、design-system側の切り替えUIコンポーネントに置き換える

### graph表示の要件
- **森全体**を1つのキャンバスに表示する。画面に収まらないため、XY方向のスクロールとズーム・パンを持つ
- 操作:
  - 何もない空間をダブルクリック → その位置にINSERT（`make_set`）
  - ノードを2つ順にクリック → MERGE（`unite`）
  - 辺をクリック → UNMERGE（`unmerge`）
- ノードの色は`Groups`と同じ（`groupColor`）。`groupColor`はグループ内の最小のキーから色を決めるため、MERGE/UNMERGEで最小キーが変わるとそのグループの色が変わる（row表示と同じ挙動）
- **ノードの位置は保つ**: 操作のたびに全体を配置し直さない。INSERTはダブルクリックした位置に置き、MERGE/UNMERGEは辺を足す・消すだけでノードは動かさない。配置の計算が要るのは、座標を持っていないノード（起動時に読み込んだデータ）だけ。森なので、グループごとに起点を決めて辺をたどった段数で並べる、といった単純な配置で足りる
- 座標はフロントの状態としてだけ持ち、**アプリを再起動したらリセットしてよい**（保存しない。座標はUIの都合なので`ufodb_v0`本体にも持たせない）
- 規模（大規模グループの扱い）は未定。`ufodb_v0`側ROADMAP Phase 11と同様に、閾値を超えたグループは簡易表示にするかどうかは、実際に大きいデータで試してから決める

### 描画方法
- 位置を保つ方針により、難しいのは配置計算よりも「ズーム・パン」と「クリック・ダブルクリックの扱い」の方になる。自作する場合、ズーム・パン（transformの管理）、画面座標⇔キャンバス座標の変換、クリックとドラッグの区別、細い線のクリック判定などを自分で書くことになる
- 候補: React Flow（`@xyflow/react`）。ズーム・パン、`onNodeClick`/`onEdgeClick`、画面座標→キャンバス座標の変換（`screenToFlowPosition`）を持ち、座標を利用側のstateで持つ設計なので「位置を保つ」と相性が良い。ノードの見た目はカスタムコンポーネントにできる。注意点: 標準ではダブルクリックがズームに割り当てられているので無効化が必要。design-systemの依存になるため、StudioとPlaygroundの両方のバンドルに入る
- [ ] 描画方法（ライブラリを使うか自作か）を決める

### 実装時に決めること
- [ ] `unmerge`のTauriコマンドを追加する（Phase 2の`unmerge`と共通。本体の`Ufdb::unmerge`は戻り値が`()`だが、辺のクリックから呼ぶので存在しない辺を指定することは基本的に起きない）
- [ ] INSERTのキー名の入力方法（ダブルクリックした位置に入力欄を出す／ダイアログ等）
- [ ] MERGEの選択のキャンセル方法（同じノードを再クリック／Esc／空白クリック）と、同じグループ同士を選んだとき（`unite`が`false`、辺は増えない）の見せ方
- [ ] ホイールの役割（ホイールでズーム／ホイールでスクロールしてCtrl+ホイールでズーム。React Flowなら`panOnScroll`）
- [ ] ノードのドラッグで位置を動かせるようにするか（要件にはないが、ライブラリを使うと標準で付いてくることが多い）

## Phase 5: 永続化対応（SAVE/LOAD）
`ufodb_v0`側で永続化（Phase 12、`ufodb_v0::storage`として`pub mod storage;`済み）が実装されたのを受けて、GUI側もCLIと同じ保存データを扱えるようにする。

- [ ] **前提となるブロッカー**: `ufodb_v0::storage`の保存先(`./ufo_data/{db_name}.json`)はカレントディレクトリ基準の相対パス。CLI(`ufodb`リポジトリ直下で起動)とGUI(`tauri-scratch/src-tauri`から起動されることが多い)では起動元が異なるため、同じ相対パスでも別のファイルを見てしまう。`ufodb_v0`側でcwdに依存しない保存先解決に直してもらう必要がある（このリポジトリでは対応しない）
- [ ] `save`コマンド: `ufodb_v0::storage::save(&ufdb, db_name)`を呼ぶTauriコマンドを追加。`io::Error`は`Serialize`を実装していないため、戻り値は`Result<(), String>`等に変換する
- [ ] 起動時のロード: `run()`内で`Mutex::new(ufodb_v0::Ufdb::new())`の代わりに、`ufodb_v0::storage::load(db_name)`の結果があればそれを使う形に変更する
- [ ] `db_name`の扱い: 現状GUIは`Db`層（複数DB対応、Phase 3）を持たず単一の`Ufdb`のみのため、`db_name`は当面決め打ち文字列（CLIのデフォルト`"ufdb"`と合わせる）にする。Phase 3実装後は選択中のDB名と連動させる

## 検討事項（未定）
- CLIプロセスと生きたデータを共有したくなった場合の話（TCPサーバー化）は`ufodb_v0`側ROADMAP.mdの「検討事項: TCPサーバー化」を参照。現時点では着手予定なし
