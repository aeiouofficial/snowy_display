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
unsafe fn is_cloaked(hwnd: windows_sys::Win32::Foundation::HWND) -> bool {
    use windows_sys::Win32::Foundation::HMODULE;
    extern "system" {
        fn LoadLibraryA(lpLibFileName: *const u8) -> HMODULE;
        fn GetProcAddress(hModule: HMODULE, lpProcName: *const u8) -> *const core::ffi::c_void;
    }
    type DwmGetWindowAttributeFn = unsafe extern "system" fn(
        windows_sys::Win32::Foundation::HWND,
        u32,
        *mut core::ffi::c_void,
        u32,
    ) -> i32;
    let dwm = LoadLibraryA(b"dwmapi.dll\0".as_ptr());
    if dwm.is_null() { return false; }
    let proc = GetProcAddress(dwm, b"DwmGetWindowAttribute\0".as_ptr());
    if proc.is_null() { return false; }
    let func: DwmGetWindowAttributeFn = core::mem::transmute(proc);
    let mut cloaked: u32 = 0;
    let res = func(hwnd, 14, &mut cloaked as *mut _ as *mut _, 4);
    res == 0 && cloaked != 0
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
        // Skip virtual-desktop hidden or cloaked DWM windows
        if unsafe { is_cloaked(hwnd) } { return 1; }
        let mut pid: u32 = 0;
        unsafe { GetWindowThreadProcessId(hwnd, &mut pid); }
        if pid == std::process::id() { return 1; }
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        if unsafe { GetWindowRect(hwnd, &mut rect) } == 0 { return 1; }
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
