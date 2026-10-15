//! Process-lifetime exclusive lock: prevents duplicate snow overlays and UI windows.
//! On Windows no lock file is created; other desktop OSes use kernel flock.

#[cfg(target_os = "windows")]
mod platform {
    use core::ffi::c_void;
    use std::ptr;

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateMutexW(attributes: *const c_void, initial_owner: i32, name: *const u16) -> *mut c_void;
        fn GetLastError() -> u32;
        fn CloseHandle(handle: *mut c_void) -> i32;
    }

    pub struct Guard(*mut c_void);
    impl Drop for Guard {
        fn drop(&mut self) { unsafe { CloseHandle(self.0); } }
    }

    pub fn acquire() -> Option<Guard> {
        // Local to the interactive Windows session, shared by every snow instance.
        let name: Vec<u16> = "Local\\io.aeiouofficial.snowydisplay.single-instance"
            .encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            let handle = CreateMutexW(ptr::null(), 1, name.as_ptr());
            if handle.is_null() { return None; }
            const ERROR_ALREADY_EXISTS: u32 = 183;
            if GetLastError() == ERROR_ALREADY_EXISTS {
                CloseHandle(handle);
                return None;
            }
            Some(Guard(handle))
        }
    }
}

#[cfg(unix)]
mod platform {
    use std::fs::{File, OpenOptions};
    use std::os::fd::AsRawFd;
    #[link(name = "c")]
    extern "C" { fn flock(fd: i32, operation: i32) -> i32; }

    #[allow(dead_code)]
    pub struct Guard(File);
    pub fn acquire() -> Option<Guard> {
        // Advisory lock is automatically released by the OS even after a crash.
        // This file is only an inode, not a stale process-ID-based lock.
        let path = std::env::temp_dir().join("io.aeiouofficial.snowydisplay.single-instance.lock");
        let file = OpenOptions::new().create(true).write(true).open(path).ok()?;
        const LOCK_EX: i32 = 2;
        const LOCK_NB: i32 = 4;
        if unsafe { flock(file.as_raw_fd(), LOCK_EX | LOCK_NB) } != 0 { return None; }
        Some(Guard(file))
    }
}

#[cfg(any(target_os = "windows", unix))]
pub use platform::acquire;
