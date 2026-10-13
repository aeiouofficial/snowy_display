mod window_geometry;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn desktop_overlays(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};
    let main = app.get_webview_window("main").expect("main window configured");
    main.hide()?;
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
        .invoke_handler(tauri::generate_handler![window_geometry::desktop_snapshot])
        .setup(|_app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            desktop_overlays(_app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Snowy Display");
}
