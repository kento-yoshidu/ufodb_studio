use std::sync::Mutex;

#[derive(Debug, serde::Serialize)]
struct Edge {
    source: String,
    target: String,
}

#[derive(Debug, serde::Serialize)]
struct GraphData {
    nodes: Vec<String>,
    edges: Vec<Edge>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn health() -> bool {
    ufodb_v0::Ufdb::new().is_empty()
}

#[tauri::command]
fn make_set(key: String, state: tauri::State<Mutex<ufodb_v0::Ufdb>>) -> bool {
    let mut ufdb = state.lock().unwrap();
    ufdb.make_set(&key)
}

#[tauri::command]
fn unite(key_a: String, key_b: String, state: tauri::State<Mutex<ufodb_v0::Ufdb>>) -> bool {
    let mut ufdb = state.lock().unwrap();
    ufdb.unite(&key_a, &key_b)
}

#[tauri::command]
fn same(key_a: String, key_b: String, state: tauri::State<Mutex<ufodb_v0::Ufdb>>) -> bool {
    let mut ufdb = state.lock().unwrap();
    ufdb.same(&key_a, &key_b)
}

#[tauri::command]
fn groups(state: tauri::State<Mutex<ufodb_v0::Ufdb>>) -> Vec<Vec<String>> {
    let mut ufdb = state.lock().unwrap();

    let mut groups: Vec<Vec<String>> = ufdb
        .groups()
        .into_values()
        .map(|group| group.into_iter().cloned().collect())
        .collect();

    for group in &mut groups {
        group.sort();
    }

    groups.sort_by(|a, b| b.len().cmp(&a.len()));

    groups
}

#[tauri::command]
fn graph(state: tauri::State<Mutex<ufodb_v0::Ufdb>>) -> GraphData {
    let mut ufdb = state.lock().unwrap();

    let mut nodes: Vec<String> = ufdb.groups()
        .into_values()
        .flatten()
        .cloned()
        .collect();

    nodes.sort();

    let mut edges = Vec::new();

    for key in nodes.iter() {
        if let Some(neighbors) = ufdb.neighbors(key) {
            for neighbor in neighbors {
                if key < neighbor {
                    edges.push(Edge {
                        source: key.clone(),
                        target: neighbor.clone(),
                    });
                }
            }
        }
    }

    GraphData { nodes, edges }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = match ufodb_v0::storage::data_dir() {
        Ok(dir) => dir,
        Err(e) => panic!("データディレクトリを特定できませんでした: {e}"),
    };

    let ufdb = match ufodb_v0::storage::load("ufdb", &data_dir) {
        Ok(Some(ufdb)) => ufdb,
        Ok(None) => ufodb_v0::Ufdb::new(),
        Err(e) => {
            eprintln!("failed to load ufdb: {e}");
            ufodb_v0::Ufdb::new()
        }
    };

    tauri::Builder::default()
        .manage(Mutex::new(ufdb))
        // .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            health,
            make_set,
            unite,
            same,
            groups,
            graph])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
