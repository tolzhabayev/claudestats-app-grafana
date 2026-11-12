---
title: Features
description: 'Find your way around the Claude Code Stats tabs and the filters they share.'
keywords:
  - 'Claude Code Stats'
  - dashboards
  - filters
sidebar_position: 3
---

Claude Code Stats opens from **Claude Code Stats** in the navigation menu, under **More apps**. It has five tabs. Each one answers a different question about how your team uses Claude Code:

| Tab                               | Read it to                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| [Overview](./overview.md)         | Check spend, tokens, sessions and active users at a glance.                            |
| [Costs](./costs.md)               | See where cost goes: models, team members, subagents, skills, plugins and MCP servers. |
| [Tokens](./tokens.md)             | See token volume by type, model and team member, and what drives it.                   |
| [Tools](./tools.md)               | Check how often team members accept Claude's file edits.                               |
| [Productivity](./productivity.md) | Track lines of code, commits, pull requests and active time.                           |

## Filter the data

Every tab has the same controls above the panels:

| Control         | What it does                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics**     | The Prometheus data source the app queries.                                                                                                                                      |
| **Team Member** | One or more team members, or **All**.                                                                                                                                            |
| **Repository**  | One Git repository, or **All**. Shown only when Claude Code sends repository attributes, as described in [Optional telemetry settings](../index.md#optional-telemetry-settings). |
| Filter labels   | One picker for each label set under [Filters](../configure.md#filters) on the configuration page, such as a team or cost center.                                                 |
| **Model**       | One model, or **All**. Only the **Overview**, **Costs** and **Tokens** tabs show it, because commits, pull requests, active time and edit decisions aren't recorded per model.   |
| Time range      | The period every panel covers. The default is the last 7 days.                                                                                                                   |
| Refresh         | Reloads the panels, manually or every 30 seconds to 30 minutes.                                                                                                                  |

Team members are named by their Claude account email address. Without one, the app uses the `enduser.id` attribute, and then the anonymous ID Claude Code generates for each machine. For how to set `enduser.id`, refer to [Name team members who don't sign in with a Claude account](../index.md#name-team-members-who-dont-sign-in-with-a-claude-account). Usage with none of these appears as **Unattributed** in the per-member panels. It counts towards totals but not towards **Active Users**.

The **Over Time** charts draw one stacked bar per interval, so the bars add up to the total for the period. An interval is wide enough that a chart has at most 60 bars, such as about 3 hours over 7 days, and at least 2 minutes. The current, unfinished interval isn't shown. Hover over the information icon next to a panel title to see what the panel measures.

Your choices carry over when you switch tabs and are saved in the URL, so you can share a filtered view by copying the link.

A few comparison panels skip their own filter so you can compare: **Cost by Team Member**, **Cost Distribution by Member**, **Tokens by Team Member** and **Active Time by Team Member** always show every member, and **Cost by Model**, **Tokens by Model** and **Lines of Code by Model** always show every model. Other panels, including the **Over Time** charts, follow both filters. Each tab's page lists exactly which filters apply.
