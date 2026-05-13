"""Markdown utilities — frontmatter parsing, section extraction, table parsing."""
from __future__ import annotations

import re
from typing import Optional

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


markdown_service = MarkdownService()
