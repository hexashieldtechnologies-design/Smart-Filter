---
name: GitHub HTTPS push authentication
description: GitHub API tokens may authenticate API calls while Git HTTPS pushes require Basic auth with x-access-token.
---

When using a GitHub personal access token for a transient HTTPS push, send Git's `Authorization` header as Basic auth for `x-access-token:<token>`; a Bearer header can work with the API but fail for Git transport.

**Why:** GitHub uses different authentication expectations for REST API requests and Git's smart HTTP transport, even with the same token.

**How to apply:** Keep the remote URL credential-free and provide the encoded Basic header only for the push command; never print or persist the token.