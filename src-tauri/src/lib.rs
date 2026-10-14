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
    if let Ok(config_dir) = app.path().app_config_dir() {
        let path = config_dir.join("settings.json");
        if let Ok(data) = std::fs::read_to_string(path) {
            if let Ok(val) = serde_json::from_str::<AppSettings>(&data) {
                return val;
            }
        }
    }
    AppSettings::default()
}

#[tauri::command]
fn save_desktop_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    use tauri::{Emitter, Manager};
    if let Ok(config_dir) = app.path().app_config_dir() {
        let _ = std::fs::create_dir_all(&config_dir);
        let path = config_dir.join("settings.json");
        let tmp_path = config_dir.join("settings.json.tmp");
        if let Ok(payload) = serde_json::to_string_pretty(&settings) {
            if std::fs::write(&tmp_path, payload.as_bytes()).is_ok() {
                if std::fs::rename(&tmp_path, &path).is_err() {
                    let _ = std::fs::write(&path, payload.as_bytes());
                    let _ = std::fs::remove_file(&tmp_path);
                }
            }
        }
    }
    let _ = app.emit("snowy-display:settings", &settings);
    Ok(())
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
