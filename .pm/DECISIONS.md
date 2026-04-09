# Decisions

<!-- Record key architectural decisions here -->
<!-- Format: YYYY-MM-DD — decision and rationale -->

- 2026-04-09 — **PoC test strategy**: limit unit tests to 1–3 cases per feature (happy path + one important edge/error case). Existing tests beyond this are not wrong but will not be expanded until post-PoC. Goal is to keep test maintenance low while the API is still changing. Revisit when the CLI reaches a stable v1 interface.
