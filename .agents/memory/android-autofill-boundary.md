---
name: Android Autofill boundary
description: Security boundary for credential filling across Android Autofill and Accessibility
---

Credential values should be returned through Android Autofill only after an in-app authorization, with Android-provided web-domain matching. Accessibility remains a fallback for approved non-password profile fields and must not receive password values.

**Why:** Accessibility does not reliably expose a browser’s real origin, so using it for passwords can silently weaken domain binding.

**How to apply:** Gate credential sessions on the system Autofill provider permission, require an exact stored domain and username match, and clear the native in-memory authorization when the operation stops or fails.