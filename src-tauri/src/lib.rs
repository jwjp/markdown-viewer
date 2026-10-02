use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::State;

const MAX_DOCUMENT_BYTES: u64 = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES: u64 = 8 * 1024 * 1024;

struct StartupFile(Option<PathBuf>);

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown"))
}

fn read_document_path(path: &Path) -> Result<Document, String> {
    if !is_markdown(path) {
        return Err("Choose a .md or .markdown file".into());
    }
    let size = std::fs::metadata(path).map_err(|error| error.to_string())?.len();
    if size > MAX_DOCUMENT_BYTES {
        return Err("The document exceeds the 10 MB limit".into());
    }
    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    let text = String::from_utf8(bytes)
        .map_err(|_| "This document is not UTF-8 encoded".to_string())?
        .trim_start_matches('\u{feff}')
        .to_string();
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    Ok(Document {
        name: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
        path: canonical.to_string_lossy().into_owned(),
        text,
    })
}

#[derive(serde::Serialize)]
struct Document {
    name: String,
    path: String,
    text: String,
}

#[tauri::command]
fn startup_document(state: State<'_, StartupFile>) -> Result<Option<Document>, String> {
    state.0.as_ref().map(|path| read_document_path(path)).transpose()
}

#[tauri::command]
fn read_document(path: String) -> Result<Document, String> {
    read_document_path(Path::new(&path))
}

#[tauri::command]
fn read_relative_image(document_path: String, image_path: String) -> Result<String, String> {
    let document = Path::new(&document_path);
    if !is_markdown(document) || Path::new(&image_path).is_absolute() {
        return Err("Invalid image path".into());
    }
    let base = document
        .canonicalize()
        .map_err(|error| error.to_string())?
        .parent()
        .ok_or("Invalid document path")?
        .to_path_buf();
    let image = base.join(image_path).canonicalize().map_err(|error| error.to_string())?;
    if !image.starts_with(&base) {
        return Err("Image is outside the document folder".into());
    }
    let mime = match image.extension().and_then(|ext| ext.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => return Err("Unsupported image type".into()),
    };
    let size = std::fs::metadata(&image).map_err(|error| error.to_string())?.len();
    if size > MAX_IMAGE_BYTES {
        return Err("Image exceeds the 8 MB limit".into());
    }
    let encoded = STANDARD.encode(std::fs::read(image).map_err(|error| error.to_string())?);
    Ok(format!("data:{mime};base64,{encoded}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_file = std::env::args_os()
        .skip(1)
        .map(PathBuf::from)
        .find(|path| is_markdown(path));
    tauri::Builder::default()
        .manage(StartupFile(startup_file))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            startup_document,
            read_document,
            read_relative_image
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Markdown Viewer");
}
