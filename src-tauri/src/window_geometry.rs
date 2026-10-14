use serde::Serialize;

/// Global desktop coordinates; z increases towards the viewer.
#[derive(Clone, Debug, Serialize)]
pub struct Surface {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub z: i32,
}

#[tauri::command]
pub fn desktop_snapshot() -> Vec<Surface> { enumerate() }

#[cfg(target_os = "windows")]
#[derive(Clone, Copy)]
struct DwmApi {
    get_attr: unsafe extern "system" fn(
        windows_sys::Win32::Foundation::HWND,
        u32,
        *mut core::ffi::c_void,
        u32,
    ) -> i32,
}

#[cfg(target_os = "windows")]
fn dwm_api() -> Option<DwmApi> {
    use std::sync::OnceLock;
    static DWM_API_CACHE: OnceLock<Option<DwmApi>> = OnceLock::new();
    *DWM_API_CACHE.get_or_init(|| unsafe {
        use windows_sys::Win32::Foundation::HMODULE;
        extern "system" {
            fn LoadLibraryA(lpLibFileName: *const u8) -> HMODULE;
            fn GetProcAddress(hModule: HMODULE, lpProcName: *const u8) -> *const core::ffi::c_void;
        }
        let dwm = LoadLibraryA(b"dwmapi.dll\0".as_ptr());
        if dwm.is_null() { return None; }
        let proc = GetProcAddress(dwm, b"DwmGetWindowAttribute\0".as_ptr());
        if proc.is_null() { return None; }
        Some(DwmApi { get_attr: core::mem::transmute(proc) })
    })
}

#[cfg(target_os = "windows")]
unsafe fn is_cloaked(hwnd: windows_sys::Win32::Foundation::HWND) -> bool {
    if let Some(api) = dwm_api() {
        let mut cloaked: u32 = 0;
        let res = (api.get_attr)(hwnd, 14 /* DWMWA_CLOAKED */, &mut cloaked as *mut _ as *mut _, 4);
        res == 0 && cloaked != 0
    } else {
        false
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_window_bounds(hwnd: windows_sys::Win32::Foundation::HWND) -> Option<windows_sys::Win32::Foundation::RECT> {
    use windows_sys::Win32::Foundation::RECT;
    if let Some(api) = dwm_api() {
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        let res = (api.get_attr)(hwnd, 9 /* DWMWA_EXTENDED_FRAME_BOUNDS */, &mut rect as *mut _ as *mut _, core::mem::size_of::<RECT>() as u32);
        if res == 0 && (rect.right - rect.left) > 0 && (rect.bottom - rect.top) > 0 {
            return Some(rect);
        }
    }
    None
}

/// Desktop shell windows span the whole virtual screen and are not application
/// windows. Treating them as surfaces would pile snow along the top screen edge
/// and make every frame look like a fullscreen app is covering the monitor.
#[cfg(target_os = "windows")]
unsafe fn is_shell_window(hwnd: windows_sys::Win32::Foundation::HWND) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetClassNameW;
    let mut buf = [0u16; 64];
    let len = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    if len <= 0 { return false; }
    let name = String::from_utf16_lossy(&buf[..len as usize]);
    matches!(name.as_str(), "Progman" | "WorkerW")
}

#[cfg(target_os = "windows")]
fn enumerate() -> Vec<Surface> {
    use windows_sys::Win32::Foundation::{HWND, LPARAM, RECT};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindow, GetWindowLongW, GetWindowRect, GetWindowThreadProcessId,
        IsIconic, IsWindowVisible, GWL_EXSTYLE, GW_OWNER, WS_EX_TOOLWINDOW,
    };
    unsafe extern "system" fn walk(hwnd: HWND, value: LPARAM) -> i32 {
        let output = unsafe { &mut *(value as *mut Vec<Surface>) };
        if unsafe { IsWindowVisible(hwnd) } == 0 || unsafe { IsIconic(hwnd) } != 0 { return 1; }
        if !unsafe { GetWindow(hwnd, GW_OWNER) }.is_null() { return 1; }
        // Skip toolwindows / floating palettes
        let ex_style = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) as u32 };
        if (ex_style & WS_EX_TOOLWINDOW) != 0 { return 1; }
        if unsafe { is_shell_window(hwnd) } { return 1; }
        // Skip virtual-desktop hidden or cloaked DWM windows
        if unsafe { is_cloaked(hwnd) } { return 1; }
        let mut pid: u32 = 0;
        unsafe { GetWindowThreadProcessId(hwnd, &mut pid); }
        if pid == std::process::id() { return 1; }
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        if unsafe { GetWindowRect(hwnd, &mut rect) } == 0 { return 1; }
        if let Some(frame) = unsafe { get_window_bounds(hwnd) } {
            rect = frame;
        }
        let w = rect.right - rect.left;
        let h = rect.bottom - rect.top;
        if w < 80 || h < 40 { return 1; }
        output.push(Surface { id: format!("win:{}", hwnd as usize),
            x: rect.left as f64, y: rect.top as f64, width: w as f64, height: h as f64,
            z: -(output.len() as i32), });
        1
    }
    let mut windows = Vec::new();
    unsafe { EnumWindows(Some(walk), (&mut windows as *mut Vec<Surface>) as LPARAM); }
    windows
}

#[cfg(target_os = "linux")]
fn enumerate() -> Vec<Surface> {
    use x11rb::connection::Connection;
    use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, MapState};
    let Ok((conn, screen)) = x11rb::connect(None) else { return Vec::new(); };
    let root = conn.setup().roots[screen].root;
    let Ok(atom) = conn.intern_atom(false, b"_NET_CLIENT_LIST_STACKING") else { return Vec::new(); };
    let Ok(atom) = atom.reply() else { return Vec::new(); };
    let Ok(pid_atom) = conn.intern_atom(false, b"_NET_WM_PID") else { return Vec::new(); };
    let Ok(pid_atom) = pid_atom.reply() else { return Vec::new(); };
    let type_atom = conn.intern_atom(false, b"_NET_WM_WINDOW_TYPE").ok().and_then(|c| c.reply().ok()).map(|r| r.atom);
    let desktop_atom = conn.intern_atom(false, b"_NET_WM_WINDOW_TYPE_DESKTOP").ok().and_then(|c| c.reply().ok()).map(|r| r.atom);
    let Ok(stack) = conn.get_property(false, root, atom.atom, AtomEnum::WINDOW, 0, 4096) else { return Vec::new(); };
    let Ok(stack) = stack.reply() else { return Vec::new(); };
    let Some(ids) = stack.value32() else { return Vec::new(); };
    let ids: Vec<_> = ids.collect();
    let mut windows = Vec::new();
    // EWMH stacking list is bottom -> top. Each ID is stable across frames.
    for (index, id) in ids.into_iter().enumerate() {
        let Ok(attrs) = conn.get_window_attributes(id) else { continue };
        let Ok(attrs) = attrs.reply() else { continue };
        if attrs.map_state != MapState::VIEWABLE { continue; }
        // Desktop-background windows (Nautilus, PCManFM, xfdesktop) cover the screen.
        if let (Some(type_atom), Some(desktop_atom)) = (type_atom, desktop_atom) {
            if let Ok(cookie) = conn.get_property(false, id, type_atom, AtomEnum::ATOM, 0, 16) {
                if let Ok(reply) = cookie.reply() {
                    if reply.value32().is_some_and(|mut types| types.any(|t| t == desktop_atom)) { continue; }
                }
            }
        }
        if let Ok(cookie) = conn.get_property(false, id, pid_atom.atom, AtomEnum::CARDINAL, 0, 1) {
            if let Ok(reply) = cookie.reply() {
                if reply.value32().and_then(|mut items| items.next()) == Some(std::process::id()) { continue; }
            }
        }
        let Ok(geom) = conn.get_geometry(id) else { continue; };
        let Ok(geom) = geom.reply() else { continue; };
        if geom.width < 80 || geom.height < 40 { continue; }
        let Ok(position) = conn.translate_coordinates(id, root, 0, 0) else { continue; };
        let Ok(position) = position.reply() else { continue; };
        windows.push(Surface { id: format!("x11:{id}"), x: position.dst_x as f64,
            y: position.dst_y as f64, width: geom.width as f64, height: geom.height as f64,
            z: index as i32 });
    }
    windows
}

#[cfg(target_os = "macos")]
fn enumerate() -> Vec<Surface> {
    #[repr(C)]
    struct Rect { id: u32, x: f64, y: f64, width: f64, height: f64, z: i32 }
    unsafe extern "C" { fn sd_copy_window_rects(output: *mut Rect, capacity: usize) -> usize; }
    const CAPACITY: usize = 2048;
    let mut raw: Vec<Rect> = Vec::with_capacity(CAPACITY);
    let n = unsafe { sd_copy_window_rects(raw.as_mut_ptr(), CAPACITY) }.min(CAPACITY);
    unsafe { raw.set_len(n); }
    raw.into_iter().map(|w| Surface { id: format!("mac:{}", w.id), x: w.x, y: w.y,
        width: w.width, height: w.height, z: w.z }).collect()
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn enumerate() -> Vec<Surface> { Vec::new() }
