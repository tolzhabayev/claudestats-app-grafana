---
title: Features
description: 'Find your way around the Claude Code Stats tabs and the filters they share.'
keywords:
  - 'Claude Code Stats'
  - dashboards
  - filters
sidebar_position: 3
---

Claude Code Stats opens from **Claude Code Stats** in the navigation menu, under **More apps**. It has ten tabs. Each one answers a different question about how your team uses Claude Code:

| Tab                               | Read it to                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| [Overview](./overview.md)         | Check spend, efficiency and active users at a glance, and compare team members.          |
| [Costs](./costs.md)               | See where cost goes: models, team members, subagents, skills, plugins and MCP servers.   |
| [Tokens](./tokens.md)             | See token volume by type, model and team member, and what drives it.                     |
| [Tools](./tools.md)               | Check how often team members accept Claude's file edits.                                 |
| [Productivity](./productivity.md) | Track lines of code, commits, pull requests and active time.                             |
| [Prompts](./prompts.md)           | See how the team prompts: volume, slash commands and prompt length.                      |
| [Workflow](./workflow.md)         | Check model latency, subagents, compaction, skills, MCP servers and hooks.               |
| [Reliability](./reliability.md)   | Track API errors, exhausted retries and refusals.                                        |
| [Security](./security-audit.md)   | Audit permission escalations, rejected tool calls, logins, plugins and managed settings. |
| [Traces](./traces.md)             | Inspect one prompt end to end: model requests, tool calls and their timing.              |

## Filter the data

Every tab has the same controls above the panels:

| Control         | What it does                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics**     | The Prometheus data source the app queries.                                                                                                                                      |
| **Team Member** | One or more team members, or **All**.                                                                                                                                            |
| **Repository**  | One Git repository, or **All**. Shown only when Claude Code sends repository attributes, as described in [Optional telemetry settings](../index.md#optional-telemetry-settings). |
| **Team**        | One identity-provider group, or **All**. Shown only for sessions signed in through a Claude apps gateway, as described in [Filter by team](../index.md#filter-by-team).          |
| Filter labels   | One picker for each label set under [Filters](../configure.md#filters) on the configuration page, such as a team or cost center.                                                 |
| **Model**       | One model, or **All**. Only the **Overview**, **Costs** and **Tokens** tabs show it, because commits, pull requests, active time and edit decisions aren't recorded per model.   |
| Time range      | The period every panel covers. The default is the last 7 days.                                                                                                                   |
| Refresh         | Reloads the panels, manually or every 30 seconds to 30 minutes.                                                                                                                  |

Team members are named by their Claude account email address. Without one, the app uses the `enduser.id` attribute, and then the anonymous ID Claude Code generates for each machine. For how to set `enduser.id`, refer to [Name team members who don't sign in with a Claude account](../index.md#name-team-members-who-dont-sign-in-with-a-claude-account). Usage with none of these appears as **Unattributed** in the per-member panels. It counts towards totals but not towards **Active Users**.

The **Over Time** charts draw one stacked bar per interval. An interval is wide enough that a chart has at most 60 bars, such as about 3 hours over 7 days, and at least 2 minutes. Each bar is estimated from the average rate over a slightly wider window that ends at the bar: the interval plus 1 minute, and at least 4 minutes. The overlap makes sure no usage falls between two bars, but on short time ranges it also spreads a burst across neighboring bars. The bars approximately add up to the total for the period. The current, unfinished interval isn't shown. Hover over the information icon next to a panel title to see what the panel measures.

Your choices carry over when you switch tabs and are saved in the URL, so you can share a filtered view by copying the link.

A few comparison panels skip their own filter so you can compare: **Cost by Team Member**, **Cost Distribution by Member**, **Tokens by Team Member**, **Active Time by Team Member** and **Team Leaderboard** always show every member, and **Cost by Model**, **Tokens by Model** and **Lines of Code by Model** always show every model. Other panels, including the **Over Time** charts, follow both filters. Each tab's page lists exactly which filters apply.
