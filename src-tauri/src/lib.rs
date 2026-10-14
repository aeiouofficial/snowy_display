mod window_geometry;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub snowfall: f64,
    pub wind: f64,
    pub gravity: f64,
    pub cohesion: f64,
    pub max_depth: f64,
    pub enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            snowfall: 0.67,
            wind: 0.2,
            gravity: 1.0,
            cohesion: 0.48,
            max_depth: 34.0,
            enabled: true,
        }
    }
}

#[tauri::command]
fn get_desktop_settings(app: tauri::AppHandle) -> AppSettings {
    use tauri::Manager;
    let Ok(config_dir) = app.path().app_config_dir() else { return AppSettings::default(); };
    let path = config_dir.join("settings.json");
    match std::fs::read_to_string(&path) {
        Ok(data) => match serde_json::from_str::<AppSettings>(&data) {
            Ok(value) => value,
            Err(error) => {
                eprintln!("[snowy][warning] {} is invalid ({error}); using defaults until next save", path.display());
                AppSettings::default()
            }
        },
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => AppSettings::default(),
        Err(error) => {
            eprintln!("[snowy][warning] cannot read {} ({error}); using defaults", path.display());
            AppSettings::default()
        }
    }
}

/// Write `payload` to `path` atomically: temp file in the same directory,
/// flushed to disk, then renamed over the target (MoveFileExW with
/// MOVEFILE_REPLACE_EXISTING on Windows, rename(2) on Unix).
fn write_atomic(path: &std::path::Path, payload: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let tmp_path = path.with_extension("json.tmp");
    let result = (|| {
        let mut file = std::fs::File::create(&tmp_path)?;
        file.write_all(payload)?;
        file.sync_all()?;
        drop(file);
        std::fs::rename(&tmp_path, path)
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&tmp_path);
    }
    result
}

#[tauri::command]
fn save_desktop_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    use tauri::{Emitter, Manager};
    // Broadcast first: running overlays must follow the controls even if disk I/O fails.
    if let Err(error) = app.emit("snowy-display:settings", &settings) {
        eprintln!("[snowy][error] settings broadcast failed; overlays keep previous settings: {error}");
    }
    let config_dir = app.path().app_config_dir().map_err(|error| {
        let message = format!("settings not persisted: config directory unavailable: {error}");
        eprintln!("[snowy][error] {message}");
        message
    })?;
    let persist = || -> std::io::Result<()> {
        std::fs::create_dir_all(&config_dir)?;
        let payload = serde_json::to_vec_pretty(&settings)
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?;
        write_atomic(&config_dir.join("settings.json"), &payload)
    };
    persist().map_err(|error| {
        let message = format!("settings not persisted to {}: {error}; previous file left intact", config_dir.display());
        eprintln!("[snowy][error] {message}");
        message
    })
}

#[tauri::command]
fn clear_desktop_snow(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    let _ = app.emit("snowy-display:clear-snow", ());
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn desktop_overlays(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};
    let main = app.get_webview_window("main").expect("main window configured");
    main.hide()?;
    let main_clone = main.clone();
    main.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = main_clone.hide();
        }
    });

    // Wayland deliberately uses the in-app preview. Generic clients cannot reliably
    // enumerate unrelated windows or guarantee global click-through surface layering.
    let supported = !(cfg!(target_os = "linux") && std::env::var_os("WAYLAND_DISPLAY").is_some());
    if !supported {
        eprintln!("[snowy][warning] Wayland window tracking unavailable; opening safe in-app preview");
        main.show()?;
    }
    if supported {
    for (index, monitor) in main.available_monitors()?.iter().enumerate() {
        let w = WebviewWindowBuilder::new(
            app, format!("snow-overlay-{index}"), WebviewUrl::App("overlay.html".into()))
            .title("Snowy Display Overlay")
            .transparent(true).decorations(false).shadow(false)
            .always_on_top(true).skip_taskbar(true)
            .focused(false).focusable(false).visible(false).resizable(false)
            .inner_size((monitor.size().width as f64) / monitor.scale_factor(),
                        (monitor.size().height as f64) / monitor.scale_factor())
            .build()?;
        w.set_position(PhysicalPosition::new(monitor.position().x, monitor.position().y))?;
        w.set_size(PhysicalSize::new(monitor.size().width, monitor.size().height))?;
        w.set_ignore_cursor_events(true)?;
        w.show()?;
    }
    }
    use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};
    let show = MenuItem::with_id(app, "show", "Show controls", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Snowy Display", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let icon = app.default_window_icon().cloned().expect("application icon configured");
    let _tray = TrayIconBuilder::new().icon(icon).tooltip("Snowy Display")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window_geometry::desktop_snapshot,
            get_desktop_settings,
            save_desktop_settings,
            clear_desktop_snow
        ])
        .setup(|_app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            desktop_overlays(_app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Snowy Display");
}
