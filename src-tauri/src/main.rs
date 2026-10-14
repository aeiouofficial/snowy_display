#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    std::panic::set_hook(Box::new(|info| {
        let text = format!("{info:?}");
        if let Ok(mut dir) = std::env::current_exe() {
            dir.pop();
            let _ = std::fs::write(dir.join("snowy_panic.txt"), &text);
        }
        let _ = std::fs::write(std::env::temp_dir().join("snowy-display-panic.txt"), &text);
        let _ = std::fs::write("S:\\snowy_display\\panic.txt", &text);
    }));
    snowy_display_lib::run();
}
