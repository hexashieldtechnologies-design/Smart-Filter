---
name: Local-first mobile AI boundary
description: Secure Vault’s on-device document processing and storage boundary
---

The mobile app must treat the encrypted device vault as the source of truth. Android local OCR uses the native ML Kit bridge followed by deterministic document parsing; it must not send document bytes, OCR text, profile JSON, or metadata to the API.

**Why:** Aadhaar/PAN workflows require offline operation and privacy by default, and a general-purpose LLM is unnecessary for structured identity-field extraction.

**How to apply:** Keep OCR lazy and native for development builds, release temporary decrypted files after analysis, validate extracted fields before review, and preserve explicit user confirmation before Smart Fill uses sensitive values or documents.