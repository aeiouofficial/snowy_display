fn main() {
    #[cfg(target_os = "macos")]
    cc::Build::new().file("src/macos_windows.c").compile("snowy_macos_windows");
    tauri_build::build();
}
