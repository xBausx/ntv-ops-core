# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Changed
- Unified page titles across modules with a shared `.page-title` style.
- Standardized container width behavior by treating `/dashboard` as a wide layout like queues.
- Enforced dark surfaces for `ntv-card` globally to ensure text contrast on card content.
- Modernized dashboard header and quick stats styling for consistency and readability.
- Added skeleton loading components and empty state component (previous update) for perceived performance.

### Fixed
- Resolved white-on-white readability issues by applying dark theme overrides to pantry cards and table components.
- Fixed inconsistent typography and spacing in headers across Dashboard, Installations, Incidents, Players, Admin, and Import pages.

### Notes
- Version not bumped; will bump on next commit per release process.
