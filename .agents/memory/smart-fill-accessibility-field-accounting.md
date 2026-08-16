---
name: Smart Fill accessibility field accounting
description: Rules for counting and filling fields exposed by Android Accessibility
---

Count only visible, unique semantic controls rather than every editable node. Use the current encrypted local value, then focus, set text, verify, and fall back to paste for controlled WebView inputs.

**Why:** Browser accessibility trees include address bars, hidden controls, duplicate representations, and WebView inputs that may report a successful action without updating their internal value.

**How to apply:** Keep browser chrome excluded, deduplicate by semantic field ID, keep upload/consent/submit behavior separate, and retry transient accessibility-label or controlled-input failures without creating an event loop.