#ifdef __APPLE__
#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>
#include <unistd.h>
#include <stddef.h>
#include <stdint.h>

typedef struct { uint32_t id; double x, y, width, height; int32_t z; } SDRect;

size_t sd_copy_window_rects(SDRect *out, size_t cap) {
    if (out == NULL || cap == 0) return 0;
    CFArrayRef list = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    if (list == NULL) return 0;
    size_t written = 0;
    const CFIndex count = CFArrayGetCount(list);
    for (CFIndex i = 0; i < count && written < cap; ++i) {
        CFDictionaryRef d = (CFDictionaryRef)CFArrayGetValueAtIndex(list, i);
        if (!d || CFGetTypeID(d) != CFDictionaryGetTypeID()) continue;
        int32_t pid = 0, layer = -1, windowID = 0;
        CFNumberRef owner = (CFNumberRef)CFDictionaryGetValue(d, kCGWindowOwnerPID);
        CFNumberRef level = (CFNumberRef)CFDictionaryGetValue(d, kCGWindowLayer);
        CFNumberRef identifier = (CFNumberRef)CFDictionaryGetValue(d, kCGWindowNumber);
        CFDictionaryRef bounds = (CFDictionaryRef)CFDictionaryGetValue(d, kCGWindowBounds);
        if (!owner || !level || !identifier || !bounds) continue;
        if (!CFNumberGetValue(owner, kCFNumberSInt32Type, &pid) || pid == getpid()) continue;
        if (!CFNumberGetValue(level, kCFNumberSInt32Type, &layer) || layer != 0) continue;
        if (!CFNumberGetValue(identifier, kCFNumberSInt32Type, &windowID)) continue;
        CGRect rect;
        if (!CGRectMakeWithDictionaryRepresentation(bounds, &rect)) continue;
        if (rect.size.width < 80 || rect.size.height < 40) continue;
        out[written++] = (SDRect){ .id = (uint32_t)windowID, .x = rect.origin.x,
            .y = rect.origin.y, .width = rect.size.width, .height = rect.size.height,
            .z = -(int32_t)i };
    }
    CFRelease(list);
    return written;
}
#endif
