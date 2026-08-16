---
name: MCP agent bridge boundary
description: Secure Vault’s cross-agent MCP and browser-fill integration boundary
---

Secure Vault should expose approved, scoped vault data through a local MCP server that works with multiple MCP-compatible agent hosts. MCP itself does not grant browser DOM or arbitrary desktop paste access; browser filling requires a separately paired extension/native bridge, exact origin/tab binding, short-lived approvals, and user confirmation.

**Why:** Agent interoperability is useful, but treating MCP as unrestricted access to mobile private storage, browser tabs, clipboard, or sensitive values would break the local-first and explicit-consent security model.

**How to apply:** Default to local stdio and encrypted package import, metadata/masked scopes, one-field sensitive reveals, document-type ownership for PAN/Aadhaar, and no passwords/OTP/CAPTCHA/consent/submit automation. Use an authenticated bridge for approved browser fill and verify results before claiming success.