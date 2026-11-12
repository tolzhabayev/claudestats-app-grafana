---
title: Overview
description: 'Check team spend, tokens, sessions and active users at a glance in Claude Code Stats.'
keywords:
  - 'Claude Code Stats'
  - overview
sidebar_position: 10
---

The **Overview** tab is the landing page of Claude Code Stats. It summarizes your team's Claude Code usage for the selected time range and filters.

![The Overview tab with totals, cost and token trends and environment breakdowns](../img/overview.webp)

## Check usage at a glance

The top row shows four totals:

| Panel            | What it shows                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total Cost**   | Estimated cost in US dollars.                                                                                                                                                                                 |
| **Total Tokens** | All tokens: input, output, cache reads and cache writes.                                                                                                                                                      |
| **Sessions**     | Distinct Claude Code sessions started. Launches of the `claude agents` dashboard don't count.                                                                                                                 |
| **Active Users** | Team members whose Claude Code reported cost data in the period. This includes members with an open but idle session, because Claude Code keeps reporting its cost counter. Unattributed usage isn't counted. |

Cost is the estimate Claude Code reports. For billing data, use your Anthropic or cloud provider console.

## See trends over time

| Panel                      | What it shows                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Cost Over Time**         | Cost per interval, one series per model.                                                                                  |
| **Cost by Team Member**    | Each member's share of cost.                                                                                              |
| **Token Usage Over Time**  | Tokens per interval, stacked by token type.                                                                               |
| **Active Time Over Time**  | Active time per interval, stacked as User (interaction, such as typing) and CLI (running tools and generating responses). |
| **Sessions by Start Type** | Sessions by how they started: `fresh`, `resume`, `continue` or `agents_view`.                                             |

## Check your team's environment

The bottom row shows how usage splits across environments, weighted by cost: **OS Type**, **Architecture**, **Terminal** and **Claude Code Version**.

## Filters on this tab

**Team Member** applies to every panel except **Cost by Team Member**. **Model** applies to the cost and token panels only: **Total Cost**, **Total Tokens**, **Cost Over Time**, **Cost by Team Member** and **Token Usage Over Time**. **Repository** and any [filter labels](../configure.md#filters) apply to every panel.
