---
name: Android deep-link handoff
description: Native overlay actions reuse the existing Android activity and need explicit intent refresh for Expo Router.
---

For native overlay actions that launch a route into the already-running Secure Vault activity, the activity must forward the new intent and update its current intent before relying on Expo Router query parameters.

**Why:** Android `singleTask` reuses the existing activity for Files and current-screen analysis. Without the new intent being retained, the app can open visually while the route action is still based on the original launch intent.

**How to apply:** Keep native overlay actions as explicit deep links and handle them in the focused Smart Fill route. Include the action source in the handled-action key so repeated actions such as Files followed by native Analyze are not conflated.