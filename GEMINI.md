## Project knowledge

Thie repository contains a **Grafana plugin**. You must Read @./.config/AGENTS/instructions.md before doing changes.

## Keep the plugin docs up to date

User documentation lives in `catalog-docs/` and ships with every release as the **Documentation** tab on the plugin's catalog page. `src/README.md` is the catalog **Overview** tab.

- Whenever a change adds, changes or removes something a user can see or configure (a panel, a tab, a filter, a setting, a query's behavior, a requirement), update the matching page in `catalog-docs/` **in the same change**. This includes work on GitHub issues.
- Follow `catalog-docs/AGENTS.md`, and document only what the source actually does.
- Run `npm run docs:validate` and fix everything it reports before you finish. A change isn't done while it reports warnings or unfilled sections.
