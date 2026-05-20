"""Markdown utilities — frontmatter parsing, section extraction, table parsing, structured parsers."""
from __future__ import annotations

import re
from typing import Any, Optional

import yaml


class MarkdownService:
    # ------------------------------------------------------------------
    # Frontmatter
    # ------------------------------------------------------------------

    def parse_frontmatter(self, content: str) -> tuple[dict, str]:
        """
        Extract YAML frontmatter from content.

        Returns (frontmatter_dict, body_without_frontmatter).
        If no frontmatter is present, returns ({}, content).
        """
        pattern = re.compile(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", re.DOTALL)
        match = pattern.match(content)
        if not match:
            return {}, content

        try:
            data: dict = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            data = {}

        body = content[match.end():]
        return data, body

    def render_frontmatter(self, data: dict, body: str) -> str:
        """Reconstruct markdown with updated frontmatter prepended."""
        if not data:
            return body
        fm_text = yaml.dump(data, default_flow_style=False, allow_unicode=True).rstrip("\n")
        return f"---\n{fm_text}\n---\n{body}"

    # ------------------------------------------------------------------
    # Sections
    # ------------------------------------------------------------------

    def extract_sections(self, content: str) -> dict[str, str]:
        """
        Parse ## headings into {heading_text: section_body} dict.

        Each value contains the text between this heading and the next ##
        heading (exclusive of the heading lines themselves).
        """
        result: dict[str, str] = {}
        # Split on lines that start with exactly "## "
        parts = re.split(r"^(## .+)$", content, flags=re.MULTILINE)
        # parts is: [preamble, "## Heading1", body1, "## Heading2", body2, ...]
        i = 1
        while i < len(parts) - 1:
            heading_line = parts[i]
            heading_text = heading_line[3:].strip()  # strip "## "
            body = parts[i + 1] if i + 1 < len(parts) else ""
            result[heading_text] = body
            i += 2
        return result

    def update_section(self, content: str, heading: str, new_body: str) -> str:
        """Replace the body of the named ## section with new_body."""
        # Regex that matches the heading line and everything up to the next ##
        # heading (or end of string).
        pattern = re.compile(
            r"(^## " + re.escape(heading) + r"[ \t]*\r?\n)"
            r"(.*?)"
            r"(?=^## |\Z)",
            re.MULTILINE | re.DOTALL,
        )

        def replacer(m: re.Match) -> str:  # type: ignore[type-arg]
            return m.group(1) + new_body

        updated, count = pattern.subn(replacer, content)
        if count == 0:
            # Section not found — append it
            separator = "\n" if content and not content.endswith("\n") else ""
            updated = content + separator + f"## {heading}\n" + new_body
        return updated

    # ------------------------------------------------------------------
    # Table parsing
    # ------------------------------------------------------------------

    def extract_table(self, section_content: str) -> list[dict]:
        """Parse a markdown pipe-table into a list of row dicts."""
        lines = [ln for ln in section_content.splitlines() if ln.strip().startswith("|")]
        if len(lines) < 2:
            return []

        def _split_row(line: str) -> list[str]:
            parts = line.strip().strip("|").split("|")
            return [p.strip() for p in parts]

        headers = _split_row(lines[0])

        # Skip the separator line (e.g. |---|---|)
        data_lines = [
            ln for ln in lines[1:]
            if not re.fullmatch(r"[\s|:\-]+", ln)
        ]

        rows: list[dict] = []
        for line in data_lines:
            values = _split_row(line)
            # Pad or trim values to match header count
            while len(values) < len(headers):
                values.append("")
            row = {headers[i]: values[i] for i in range(len(headers))}
            rows.append(row)
        return rows

    # ------------------------------------------------------------------
    # Task list → HTML
    # ------------------------------------------------------------------

    def task_list_to_html(self, content: str) -> str:
        """Convert GitHub-style task list items to HTML <li> elements."""
        lines = content.splitlines()
        html_lines: list[str] = []
        in_list = False

        for line in lines:
            checked_match = re.match(r"^(\s*)- \[x\] (.+)$", line, re.IGNORECASE)
            unchecked_match = re.match(r"^(\s*)- \[ \] (.+)$", line)

            if checked_match:
                if not in_list:
                    html_lines.append("<ul>")
                    in_list = True
                text = checked_match.group(2)
                html_lines.append(
                    f'<li><input type="checkbox" checked disabled> {text}</li>'
                )
            elif unchecked_match:
                if not in_list:
                    html_lines.append("<ul>")
                    in_list = True
                text = unchecked_match.group(2)
                html_lines.append(
                    f'<li><input type="checkbox" disabled> {text}</li>'
                )
            else:
                if in_list:
                    html_lines.append("</ul>")
                    in_list = False
                html_lines.append(line)

        if in_list:
            html_lines.append("</ul>")

        return "\n".join(html_lines)

    # ------------------------------------------------------------------
    # Structured sprint-log parser
    # ------------------------------------------------------------------

    def parse_sprint_log(self, content: str) -> dict[str, Any]:
        """
        Parse sprint-log.md into structured data.

        Handles two formats:
        - Fenced ```yaml block (industrial-tycoon style)
        - YAML frontmatter (--- delimited)
        Returns dict with sprint metadata + task_list as list of dicts.
        """
        # Try fenced yaml block first (```yaml ... ```)
        yaml_match = re.search(r"```ya?ml\n(.*?)\n```", content, re.DOTALL | re.IGNORECASE)
        if yaml_match:
            try:
                data = yaml.safe_load(yaml_match.group(1)) or {}
                return self._normalise_sprint(data)
            except yaml.YAMLError:
                pass

        # Fall back to YAML frontmatter
        fm, _ = self.parse_frontmatter(content)
        if fm:
            return self._normalise_sprint(fm)

        return {"sprint_id": None, "status": "unknown", "tasks": []}

    def _normalise_sprint(self, data: dict) -> dict[str, Any]:
        """Normalise raw YAML sprint dict into a consistent shape."""
        tasks_raw = data.get("task_list") or data.get("tasks") or []
        tasks: list[dict[str, Any]] = []
        for t in tasks_raw:
            if not isinstance(t, dict):
                continue
            tasks.append({
                "task_id": t.get("task_id", ""),
                "title": t.get("title", ""),
                "type": t.get("type", ""),
                "description": str(t.get("description", "")).strip(),
                "estimated_minutes": t.get("estimated_minutes"),
                "status": t.get("status", "pending"),
                "attempt_count": t.get("attempt_count", 0),
                "worker_id": t.get("worker_id"),
                "worker_started_at": t.get("worker_started_at"),
                "completed_at": t.get("completed_at"),
                "pr_reference": t.get("pr_reference"),
                "qa_verdict": t.get("qa_verdict"),
                "qa_notes": str(t.get("qa_notes", "")).strip() or None,
                "depends_on": t.get("depends_on") or [],
                "assigned_agent": t.get("assigned_agent", "builder"),
            })

        notes: list[dict[str, Any]] = []
        for n in (data.get("notes") or []):
            if isinstance(n, dict):
                notes.append({
                    "timestamp": n.get("timestamp", ""),
                    "type": n.get("type", "info"),
                    "message": str(n.get("message", "")).strip(),
                })

        return {
            "sprint_id": data.get("sprint_id"),
            "date": data.get("date"),
            "game_name": data.get("game_name"),
            "milestone_ref": data.get("milestone_ref"),
            "status": data.get("status", "unknown"),
            "total_estimated_minutes": data.get("total_estimated_minutes"),
            "tasks": tasks,
            "notes": notes,
        }

    # ------------------------------------------------------------------
    # Structured plan parser
    # ------------------------------------------------------------------

    def parse_plan(self, content: str) -> dict[str, Any]:
        """Parse plan.md into milestones and task index."""
        milestones: list[dict[str, Any]] = []
        milestone_sections = re.split(r"(?=^### M\d+)", content, flags=re.MULTILINE)
        for section in milestone_sections:
            if not section.strip() or not re.match(r"^### M\d+", section):
                continue
            m = self._parse_milestone_section(section)
            if m:
                milestones.append(m)

        # Task index table (## Task Index section)
        task_index: list[dict[str, Any]] = []
        ti_match = re.search(r"^## Task Index\s*\n(.*?)(?=^## |\Z)", content, re.MULTILINE | re.DOTALL)
        if ti_match:
            task_index = self.extract_table(ti_match.group(1))

        # Dependency table
        dep_table: list[dict[str, Any]] = []
        dep_match = re.search(r"^### Task dependency table\s*\n(.*?)(?=^### |\Z)", content, re.MULTILINE | re.DOTALL)
        if dep_match:
            dep_table = self.extract_table(dep_match.group(1))

        # Status section (## Status)
        status_text = ""
        st_match = re.search(r"^## Status\s*\n(.*?)(?=^## |\Z)", content, re.MULTILINE | re.DOTALL)
        if st_match:
            status_text = st_match.group(1).strip()

        return {
            "milestones": milestones,
            "task_index": task_index,
            "dependency_table": dep_table,
            "status_text": status_text,
        }

    def _parse_milestone_section(self, section: str) -> Optional[dict[str, Any]]:
        lines = section.splitlines()
        if not lines:
            return None

        # "### M1 — Core Infrastructure and Combat"
        header_match = re.match(r"^### (M\d+)\s*[—\-–]+\s*(.+)$", lines[0])
        if not header_match:
            return None

        milestone_id = header_match.group(1)
        title = header_match.group(2).strip()

        def bold_field(name: str) -> str:
            m = re.search(rf"\*\*{re.escape(name)}:\*\*\s*(.+)", section)
            return m.group(1).strip() if m else ""

        # Success criteria — bulleted list after **Success criteria:**
        success_criteria: list[str] = []
        in_criteria = False
        for line in lines[1:]:
            if re.search(r"\*\*Success criteria:\*\*", line):
                in_criteria = True
                continue
            if in_criteria:
                if re.match(r"^- (.+)", line):
                    success_criteria.append(re.match(r"^- (.+)", line).group(1).strip())  # type: ignore[union-attr]
                elif line.strip().startswith("**") or (line.strip() and not line.startswith(" ")):
                    in_criteria = False

        tasks_str = bold_field("Tasks")
        task_ids = [t.strip() for t in tasks_str.split(",") if t.strip()] if tasks_str else []

        return {
            "id": milestone_id,
            "title": f"{milestone_id} — {title}",
            "short_title": title,
            "goal": bold_field("Goal"),
            "estimated_nights": bold_field("Estimated nights"),
            "actual_nights": bold_field("Actual nights"),
            "status": bold_field("Status").lower() or "pending",
            "critical_path": bold_field("Critical path"),
            "task_ids": task_ids,
            "success_criteria": success_criteria,
        }

    # ------------------------------------------------------------------
    # Structured progress log parser
    # ------------------------------------------------------------------

    def parse_progress_log(self, content: str) -> list[dict[str, Any]]:
        """
        Parse progress.md into list of entry dicts (newest first).

        Entry format in file:
          ## YYYY-MM-DD — task-id: Task Title
          PR: #N (url)
          Status: done
          Notes: ...
        """
        # Split on ## date-prefixed headings
        sections = re.split(r"(?=^## \d{4}-\d{2}-\d{2})", content, flags=re.MULTILINE)
        entries: list[dict[str, Any]] = []
        for section in sections:
            if not section.strip() or not re.match(r"^## \d{4}-\d{2}-\d{2}", section):
                continue
            entry = self._parse_progress_entry(section)
            if entry:
                entries.append(entry)
        # Return newest first
        return list(reversed(entries))

    def _parse_progress_entry(self, section: str) -> Optional[dict[str, Any]]:
        lines = section.splitlines()
        if not lines:
            return None

        # "## 2026-05-02 — it-021: Create Real-Time Team Leaderboard ScreenGui"
        header_match = re.match(r"^## (\d{4}-\d{2}-\d{2})\s*[—\-–]+\s*([^:]+):\s*(.+)$", lines[0])
        if not header_match:
            return None

        date = header_match.group(1)
        task_id = header_match.group(2).strip()
        title = header_match.group(3).strip()

        pr = ""
        pr_url = ""
        status = ""
        notes_lines: list[str] = []
        in_notes = False

        for line in lines[1:]:
            if not line.strip() and not in_notes:
                continue
            pr_match = re.match(r"^PR:\s*#?(\S+)(?:\s+\((.+)\))?", line)
            if pr_match:
                pr = pr_match.group(1).rstrip(")")
                pr_url = pr_match.group(2) or ""
                in_notes = False
                continue
            status_match = re.match(r"^Status:\s*(.+)", line)
            if status_match:
                status = status_match.group(1).strip()
                in_notes = False
                continue
            notes_match = re.match(r"^Notes:\s*(.*)", line)
            if notes_match:
                in_notes = True
                rest = notes_match.group(1).strip()
                if rest:
                    notes_lines.append(rest)
                continue
            if in_notes:
                notes_lines.append(line)

        return {
            "date": date,
            "task_id": task_id,
            "title": title,
            "pr": pr,
            "pr_url": pr_url,
            "status": status or "done",
            "notes": "\n".join(notes_lines).strip(),
        }

    # ------------------------------------------------------------------
    # Structured overrides parser
    # ------------------------------------------------------------------

    def parse_overrides(self, content: str, game_filter: Optional[str] = None) -> list[dict[str, Any]]:
        """
        Parse human-overrides.md into list of override dicts.

        Handles two header formats:
        - ## Override: short description (spec format)
        - ## Override — game — timestamp (append format from repo_service)
        """
        # Strip fenced code blocks first to avoid matching template examples
        stripped = re.sub(r"```.*?```", "", content, flags=re.DOTALL)

        # Split on ## Override headers
        sections = re.split(r"(?=^## Override)", stripped, flags=re.MULTILINE)
        entries: list[dict[str, Any]] = []
        for section in sections:
            if not section.strip() or not re.match(r"^## Override", section):
                continue
            entry = self._parse_override_entry(section)
            if not entry:
                continue
            # Skip template/placeholder entries (contain { } substitution markers)
            if "{" in (entry.get("id") or "") or "{" in (entry.get("game") or ""):
                continue
            if game_filter and entry.get("game", "").lower() != game_filter.lower():
                # Also include entries with no game field (global overrides)
                if entry.get("game"):
                    continue
            entries.append(entry)

        return list(reversed(entries))  # newest first

    def _parse_override_entry(self, section: str) -> Optional[dict[str, Any]]:
        lines = section.splitlines()
        if not lines:
            return None

        header = lines[0]
        description = ""
        game_from_header = ""
        timestamp_from_header = ""

        # "## Override — game — 2026-05-13 10:30 UTC"  (append format)
        append_match = re.match(r"^## Override\s*[—\-–]+\s*([^—\-–]+)\s*[—\-–]+\s*(.+)$", header)
        if append_match:
            game_from_header = append_match.group(1).strip()
            timestamp_from_header = append_match.group(2).strip()
        else:
            # "## Override: short description"
            spec_match = re.match(r"^## Override[:\s]+(.+)$", header)
            if spec_match:
                description = spec_match.group(1).strip()

        def field(name: str) -> str:
            m = re.search(rf"^{re.escape(name)}:\s*(.+)$", section, re.MULTILINE)
            return m.group(1).strip() if m else ""

        # Multi-line Request field
        request_lines: list[str] = []
        in_request = False
        known_fields = {"ID", "Timestamp", "Game", "Type", "Requested by", "Affected files",
                        "Status", "Applied by", "Supersedes", "Request"}
        for line in lines[1:]:
            field_match = re.match(r"^([\w ]+):\s*(.*)", line)
            if field_match and field_match.group(1).strip() in known_fields:
                if field_match.group(1).strip() == "Request":
                    in_request = True
                    rest = field_match.group(2).strip()
                    if rest:
                        request_lines.append(rest)
                else:
                    in_request = False
                continue
            if in_request and line.strip():
                request_lines.append(line.strip())

        # Body text (for append format — text after the header line)
        body_lines: list[str] = []
        if game_from_header:
            skip_next_empty = True
            for line in lines[1:]:
                if skip_next_empty and not line.strip():
                    continue
                skip_next_empty = False
                body_lines.append(line)

        return {
            "id": field("ID") or timestamp_from_header,
            "timestamp": field("Timestamp") or timestamp_from_header,
            "game": field("Game") or game_from_header,
            "type": field("Type") or "live-edit",
            "description": description or field("ID"),
            "status": field("Status") or "active",
            "request": "\n".join(request_lines).strip() or "\n".join(body_lines).strip(),
            "applied_by": field("Applied by"),
            "requested_by": field("Requested by"),
        }


markdown_service = MarkdownService()
