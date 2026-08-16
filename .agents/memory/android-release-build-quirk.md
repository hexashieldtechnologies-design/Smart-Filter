---
name: Android release build quirk
description: Environment-specific Gradle/JVM behavior encountered while packaging the Android release APK
---

Android release packaging in this workspace can hit a JVM `PerfLongVariant` SIGBUS, Gradle cache quota errors, or a five-minute CMake timeout even when compilation is healthy. A single arm64 release is usually the practical target for phone APK delivery.

**Why:** The failure is in the build runtime and native multi-ABI CMake workload, not in application code; retaining all four ABIs significantly increases build time and cache pressure.

**How to apply:** For release packaging, disable JVM PerfData, clear only generated Gradle caches if quota errors occur, use limited Gradle workers, and pass `-PreactNativeArchitectures=arm64-v8a` when an arm64 phone APK is acceptable. If the wrapper download is interrupted, use the cached Gradle distribution rather than rebuilding all dependencies. When generated CMake outputs are already present and unchanged, a packaging-only assemble can skip `:app:buildCMakeRelWithDebInfo` to finish within the command window.

The Gradle wrapper's `--offline` mode can also fail before compilation when the React Native Foojay resolver plugin is not cached; normal dependency resolution may be required once to populate it. **Why:** This is dependency-cache state, not an app or native-module failure. **How to apply:** If offline configuration reports the Foojay plugin as missing, retry online, then reuse the resulting Gradle/Metro caches for packaging.