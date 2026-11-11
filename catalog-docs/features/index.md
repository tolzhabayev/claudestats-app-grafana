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

| Tab                               | Read it to                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| [Overview](./overview.md)         | Check spend, tokens, sessions and active users at a glance.                   |
| [Costs](./costs.md)               | See where cost goes: models, team members, subagents, skills and MCP servers. |
| [Tokens](./tokens.md)             | See token volume by type, model and team member, and what drives it.          |
| [Tools](./tools.md)               | Check how often team members accept Claude's file edits.                      |
| [Productivity](./productivity.md) | Track lines of code, commits, pull requests and active time.                  |

## Filter the data

Every tab has the same controls above the panels:

| Control         | What it does                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Metrics**     | The Prometheus data source the app queries.                                                                                                                                    |
| **Team Member** | One team member, by email address, or **All**.                                                                                                                                 |
| **Model**       | One model, or **All**. Only the **Overview**, **Costs** and **Tokens** tabs show it, because commits, pull requests, active time and edit decisions aren't recorded per model. |
| Time range      | The period every panel covers. The default is the last 7 days.                                                                                                                 |
| Refresh         | Reloads the panels, manually or every 30 seconds to 30 minutes.                                                                                                                |

Your choices carry over when you switch tabs and are saved in the URL, so you can share a filtered view by copying the link.

Panels that compare team members, such as **Cost by Team Member**, always show every member so you can compare them. Panels that compare models, such as **Cost by Model**, always show every model.
