---
title: Tools
description: 'Check how often your team accepts or rejects the file edits Claude Code proposes.'
keywords:
  - 'Claude Code Stats'
  - tools
  - acceptance rate
sidebar_position: 40
---

The **Tools** tab shows the permission decisions team members make on the file-editing tools: `Edit`, `Write` and `NotebookEdit`. Other tools, such as Bash, don't appear here.

![The Tools tab with the acceptance rate and edit decisions](../img/tools.webp)

## Check the acceptance rate

| Panel                        | What it shows                                       |
| ---------------------------- | --------------------------------------------------- |
| **Tool Acceptance Rate**     | The percentage of edit decisions that were accepts. |
| **Tool Decisions**           | Accepts and rejects for the period.                 |
| **Tool Decisions Over Time** | Accepts and rejects per interval.                   |
| **Usage by Tool**            | Decisions per tool.                                 |

A decision counts whether a team member made it or a configuration rule or hook made it automatically.

## Break down decisions by language and source

| Panel                           | What it shows                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Acceptance Rate by Language** | The acceptance rate for each language of the edited file, such as TypeScript or Markdown, highest first. |
| **Decisions by Source**         | Who made each decision, with the count and share of each.                                                |

**Decisions by Source** shows these sources:

| Source                 | Meaning                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| **Config rule (auto)** | A permission rule in the Claude Code settings decided automatically. |
| **Hook (auto)**        | A hook made the decision.                                            |
| **User: always allow** | The team member allowed the edit and similar edits from then on.     |
| **User: allow once**   | The team member allowed this edit only.                              |
| **User: reject**       | The team member rejected the edit.                                   |
| **User: cancel**       | The team member cancelled the prompt without answering.              |

A language with only a few decisions can swing between 0% and 100%, so compare it with **Decisions by Source** and **Usage by Tool** before drawing conclusions.

## Filters on this tab

**Team Member** applies to every panel. The tab has no **Model** filter, because edit decisions aren't recorded per model. **Repository** and any [filter labels](../configure.md#filters) apply to every panel.
