---
title: Productivity
description: 'Track lines of code, commits, pull requests and active time from Claude Code.'
keywords:
  - 'Claude Code Stats'
  - productivity
  - commits
sidebar_position: 50
---

The **Productivity** tab shows the output of your team's Claude Code sessions and how much time they spend in them.

## Track output

| Panel                       | What it shows                                        |
| --------------------------- | ---------------------------------------------------- |
| **Lines of Code**           | Lines Claude Code added plus lines it removed.       |
| **Commits**                 | Git commits Claude Code created.                     |
| **Pull Requests**           | Pull requests or merge requests Claude Code created. |
| **Lines Added vs Removed**  | The split between added and removed lines.           |
| **Lines of Code Over Time** | Added and removed lines per interval.                |
| **Commits Over Time**       | Commits per interval.                                |
| **Pull Requests Over Time** | Pull requests per interval.                          |

Panels show no data when nothing happened in the period, such as no commits.

## Track active time

| Panel                          | What it shows                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Active Time**                | Time spent actively using Claude Code, not counting idle time. It includes both typing and the time Claude Code spends running tools and generating responses. |
| **Active Time by Team Member** | Active time per member.                                                                                                                                        |

## Filters on this tab

**Team Member** applies to every panel except **Active Time by Team Member**, which always shows every member. The tab has no **Model** filter, because commits, pull requests and active time aren't recorded per model.
