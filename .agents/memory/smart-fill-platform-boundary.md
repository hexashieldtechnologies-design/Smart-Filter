---
name: Smart Fill platform boundary
description: Native Android overlay and external-browser interaction constraints for Smart Fill
---

Smart Fill must distinguish the controlled in-app form experience from cross-app Android behavior. A floating overlay does not grant Chrome DOM access; real cross-app interaction requires an explicitly supported native Android bridge, while preview flows should remain honest about being in-app.

**Why:** Android overlay permission, accessibility interaction, and browser DOM access are separate capabilities with different platform and policy constraints.

**How to apply:** Keep the native bridge optional and explicit, gate Android activation on verified permissions, and never silently fall back to pretending that Chrome HTML is available.