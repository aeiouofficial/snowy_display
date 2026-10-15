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
    #[serde(default = "default_theme_id")]
    pub theme_id: String,
    #[serde(default)]
    pub automatic_theme: bool,
    #[serde(default = "default_performance_mode")]
    pub performance_mode: String,
    #[serde(default = "default_interaction_mode")]
    pub interaction_mode: String,
    #[serde(default="default_true")]
    pub animations_enabled:bool,
    #[serde(default="default_density")]
    pub decoration_density:f64,
    #[serde(default="default_visual_scale")]
    pub visual_scale:f64,
    #[serde(default)]
    pub reduce_motion:bool,
    #[serde(default="default_true")]
    pub show_scene_objects:bool,
    #[serde(default)]
    pub auto_plows:bool,
    #[serde(default="default_plow_interval")]
    pub plow_interval:f64,
}
fn default_true()->bool{true}
fn default_density()->f64{0.72}
fn default_visual_scale()->f64{1.0}
fn default_plow_interval()->f64{20.0}
fn default_interaction_mode() -> String { "none".into() }
fn default_theme_id() -> String { "winter-snow".into() }
fn default_performance_mode() -> String { "balanced".into() }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            snowfall: 0.67,
            wind: 0.2,
            gravity: 1.0,
            cohesion: 0.48,
            max_depth: 34.0,
            enabled: true,
            theme_id: default_theme_id(),
            automatic_theme: false,
            performance_mode: default_performance_mode(),
            interaction_mode: default_interaction_mode(),
            animations_enabled:default_true(),
            decoration_density:default_density(),
            visual_scale:default_visual_scale(),
            reduce_motion:false,
            show_scene_objects:true,
            auto_plows:false,
            plow_interval:default_plow_interval(),
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
fn setup_tray_and_window(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::Manager;
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        // Initial launch should not steal focus from the user's active task.
        let main_clone = main.clone();
        main.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = main_clone.hide();
            }
        });
    }

    use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};
    let show = MenuItem::with_id(app, "show", "Show controls", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Snowy Display", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let mut tray_builder = TrayIconBuilder::new()
        .tooltip("Snowy Display")
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
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }
    let _ = tray_builder.build(app);
    Ok(())
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopMonitor {
    id: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale_factor: f64,
}

#[tauri::command]
fn desktop_monitors(window: tauri::WebviewWindow) -> Vec<DesktopMonitor> {
    window.available_monitors().unwrap_or_default().iter().enumerate().map(|(idx, m)| {
        DesktopMonitor {
            id: format!("display-{idx}"),
            x: m.position().x,
            y: m.position().y,
            width: m.size().width,
            height: m.size().height,
            scale_factor: m.scale_factor(),
        }
    }).collect()
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn create_overlays(app: &tauri::AppHandle) {
    use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

    // Wayland deliberately uses the in-app preview.
    let supported = !(cfg!(target_os = "linux") && std::env::var_os("WAYLAND_DISPLAY").is_some());
    if !supported {
        eprintln!("[snowy][warning] Wayland window tracking unavailable; in-app preview only");
        return;
    }

    if let Some(main) = app.get_webview_window("main") {
        if let Ok(monitors) = main.available_monitors() {
            let mut valid_labels = std::collections::HashSet::new();
            for (index, monitor) in monitors.iter().enumerate() {
                let label = format!("snow-overlay-{index}");
                valid_labels.insert(label.clone());
                if let Some(w) = app.get_webview_window(&label) {
                    // Reconcile changing resolution, DPI and monitor positions on hotplug.
                    let _ = w.set_position(PhysicalPosition::new(monitor.position().x, monitor.position().y));
                    let _ = w.set_size(PhysicalSize::new(monitor.size().width, monitor.size().height));
                    continue;
                }
                let built = WebviewWindowBuilder::new(
                    app, label, WebviewUrl::App("overlay.html".into()))
                    .title("Snowy Display Overlay")
                    .transparent(true).decorations(false).shadow(false)
                    .always_on_top(true).skip_taskbar(true)
                    .focused(false).focusable(false).visible(false).resizable(false)
                    .inner_size((monitor.size().width as f64) / monitor.scale_factor(),
                                (monitor.size().height as f64) / monitor.scale_factor())
                    .build();
                if let Ok(w) = built {
                    let _ = w.set_position(PhysicalPosition::new(monitor.position().x, monitor.position().y));
                    let _ = w.set_size(PhysicalSize::new(monitor.size().width, monitor.size().height));
                    let _ = w.set_ignore_cursor_events(true);
                    // Renderer reveals its overlay only after its first successful paint.
                }
            }
            for (label, window) in app.webview_windows() {
                if label.starts_with("snow-overlay-") && !valid_labels.contains(&label) {
                    let _ = window.destroy();
                }
            }
        }
    }
}

/// Poll display topology only every three seconds; geometry within each
/// display is handled separately by the single simulation coordinator.
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn spawn_monitor_watcher(app: tauri::AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_secs(3));
        let handle = app.clone();
        if app.run_on_main_thread(move || create_overlays(&handle)).is_err() {
            break; // Tauri event loop closed.
        }
    });
}

#[tauri::command]
fn get_cursor_position() -> Option<(f64, f64)> {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
        use windows_sys::Win32::Foundation::POINT;
        let mut pt = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut pt) != 0 {
            return Some((pt.x as f64, pt.y as f64));
        }
    }
    None
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn spawn_cursor_tracker(app: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    {
        use tauri::Emitter;
        std::thread::spawn(move || {
            use std::time::Duration;
            let mut last_x = -9999.0;
            let mut last_y = -9999.0;
            loop {
                unsafe {
                    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
                    use windows_sys::Win32::Foundation::POINT;
                    let mut pt = POINT { x: 0, y: 0 };
                    if GetCursorPos(&mut pt) != 0 {
                        let x = pt.x as f64;
                        let y = pt.y as f64;
                        if (x - last_x).abs() >= 1.0 || (y - last_y).abs() >= 1.0 {
                            last_x = x;
                            last_y = y;
                            let _ = app.emit("cursor-move", (x, y));
                        }
                    }
                }
                std::thread::sleep(Duration::from_millis(16));
            }
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window_geometry::desktop_snapshot,
            desktop_monitors,
            get_desktop_settings,
            save_desktop_settings,
            clear_desktop_snow,
            get_cursor_position
        ])
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            setup_tray_and_window(app)?;
            Ok(())
        });

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder
            .build(tauri::generate_context!())
            .expect("failed to build Snowy Display")
            .run(|app, event| {
                if let tauri::RunEvent::Ready = event {
                    create_overlays(app);
                    spawn_monitor_watcher(app.clone());
                    spawn_cursor_tracker(app.clone());
                }
            });
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder
            .run(tauri::generate_context!())
            .expect("failed to run Snowy Display");
    }
}

