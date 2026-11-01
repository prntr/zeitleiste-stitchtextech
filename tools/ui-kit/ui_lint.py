#!/usr/bin/env python3
"""ui-kit gate for static sites without a Node toolchain (stdlib only, Python >= 3.9).

    uv run --no-project python ui_lint.py [--update] [--tokens FILE ...] PATH ...

Checks .html and .css files under PATH with the same rules and the same
`ui-debt.json` allowlist as the stylelint gate (ui-gate.mjs):

  lang-mismatch        a text block contradicts the nearest `lang` (lang-words.json);
                       also <html> without lang
  outline-replacement  outline: none/0 without a :focus-visible/:focus-within rule
                       that draws a replacement for the same selector
  color-no-hex         a hex colour outside a token file or a :root/html token block
  color-function       rgb()/rgba()/hsl()/hsla() literal, same exemptions

A custom property defined in a rule whose every selector starts with :root or
html (a token block, including dark-mode overrides) is exempt from the colour
rules, and so is every line of a file passed with --tokens. The allowlist is
exact: more findings than listed fail, fewer fail too until `--update` lowers
the count. When ui-kit.lock.json exists, every copy it lists must match its
recorded hash (no Node needed for that check). Copied into consumers from
ui-kit gates/; see gates/README.md.
"""

import hashlib
import json
import os
import re
import sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


WORDS = read_json(os.path.join(HERE, "lang-words.json"))
HEX = re.compile(
    r"(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])"
)
FUNC = re.compile(r"\b(?:rgba?|hsla?)\(")
STATE = re.compile(
    r":(?:focus-visible|focus-within|focus|hover|active|checked|disabled|not\([^)]*\)|is\([^)]*\)|where\([^)]*\))"
)
INDICATOR = re.compile(
    r"^(outline(-color|-width|-style)?|box-shadow|border(-color|-bottom|-bottom-color)?|text-decoration(-line)?|background(-color)?)$",
    re.IGNORECASE,
)
SKIP_DIRS = {"node_modules", "dist", "build", ".git", ".venv", ".local", "vendor"}


def judge(text, lang):
    """Same rule as lang-audit.mjs: returns the language the text looks like, or None."""
    tokens = re.findall(r"[a-zäöüß]+", text.lower())
    if len(tokens) < 3:
        return None
    de = sum(t in WORDS["de"] for t in tokens)
    en = sum(t in WORDS["en"] for t in tokens)
    primary = (lang or "").lower().split("-")[0]
    if primary == "en" and ((de >= 1 and en == 0) or (de >= 2 and de >= 2 * en)):
        return "de"
    if primary == "de" and (
        (en >= 2 and de == 0 and len(tokens) >= 4) or (en >= 3 and en >= 3 * de)
    ):
        return "en"
    return None


# --- CSS -------------------------------------------------------------------


def strip_comments(css):
    return re.sub(
        r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), css, flags=re.DOTALL
    )


def css_rules(css, line0=1):
    """Yields (selector, [(prop, value, line)]) for every style rule, descending into @media/@supports/@layer."""
    css = strip_comments(css)
    stack = []  # selectors of open blocks
    decls = [[]]
    start = 0
    i = 0
    while i < len(css):
        c = css[i]
        if c == "{":
            stack.append(css[start:i].strip())
            decls.append([])
            start = i + 1
        elif c == ";" or c == "}":
            chunk = css[start:i]
            if ":" in chunk and stack and not stack[-1].startswith("@"):
                prop, _, value = chunk.partition(":")
                line = line0 + css.count(
                    "\n", 0, start + len(chunk) - len(chunk.lstrip())
                )
                decls[-1].append((prop.strip(), value.strip(), line))
            start = i + 1
            if c == "}" and stack:
                sel = stack.pop()
                own = decls.pop()
                if not sel.startswith("@"):
                    yield sel, own
        i += 1


def selector_parts(sel):
    return [s.strip() for s in sel.split(",") if s.strip()]


def base(sel):
    return re.sub(r"\s+", " ", re.sub(r"::?[a-z-]+$", "", STATE.sub("", sel))).strip()


def removes_outline(prop, value):
    p, v = prop.lower(), value.lower().strip()
    if p == "outline":
        return re.match(r"^(none|0|0px)(\s|$)", v) is not None
    if p == "outline-style":
        return v == "none"
    if p == "outline-width":
        return re.match(r"^0(px)?$", v) is not None
    return False


def draws_indicator(decls, skip=None):
    for prop, value, line in decls:
        if (prop, value, line) == skip or not INDICATOR.match(prop):
            continue
        if removes_outline(prop, value) or value.strip().lower() in (
            "none",
            "0",
            "transparent",
        ):
            continue
        return True
    return False


def lint_css(path, css, line0, is_token_file, out):
    rules = list(css_rules(css, line0))
    focus = {}
    for sel, decls in rules:
        for s in selector_parts(sel):
            if ":focus-visible" in s or ":focus-within" in s:
                focus.setdefault(base(s), []).append(decls)
    for sel, decls in rules:
        token_block = all(re.match(r"^(:root|html)\b", s) for s in selector_parts(sel))
        for d in decls:
            prop, value, line = d
            if removes_outline(prop, value):
                for s in selector_parts(sel):
                    # Any focus-visible rule for the same element may draw the
                    # replacement, this rule included; the removal never counts.
                    if any(draws_indicator(o, d) for o in focus.get(base(s), [])):
                        continue
                    out.append(
                        (
                            "outline-replacement",
                            path,
                            line,
                            f'"{s}" removes the outline without a :focus-visible replacement',
                        )
                    )
                    break
            if is_token_file or (token_block and prop.startswith("--")):
                continue
            for m in HEX.finditer(value):
                out.append(("color-no-hex", path, line, f"{prop}: {m.group(0)}"))
            for m in FUNC.finditer(value):
                out.append(
                    (
                        "color-function",
                        path,
                        line,
                        f"{prop}: {value[m.start() : m.start() + 24]}",
                    )
                )


# --- HTML ------------------------------------------------------------------


class Page(HTMLParser):
    SKIP = frozenset(
        {"script", "style", "code", "pre", "kbd", "samp", "noscript", "template"}
    )
    VOID = frozenset(
        {
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "source",
            "track",
            "wbr",
        }
    )

    def __init__(self, path, out):
        super().__init__(convert_charrefs=True)
        self.path, self.out = path, out
        self.stack = []  # (tag, lang, skip)
        self.html_lang = None
        self.styles = []  # (css, line)
        self.text = []
        self.in_style = None

    def lang(self):
        for _, lang, _ in reversed(self.stack):
            if lang is not None:
                return lang
        return ""

    def flush(self):
        text = re.sub(r"\s+", " ", " ".join(self.text)).strip()
        self.text = []
        if text and self.stack and not self.stack[-1][2]:
            self.check(text, self.stack[-1][0])

    def check(self, text, where):
        looks = judge(text, self.lang())
        if looks:
            self.out.append(
                (
                    "lang-mismatch",
                    self.path,
                    self.getpos()[0],
                    f"<{where}> lang={self.lang() or '∅'} reads as {looks}: {text[:80]}",
                )
            )

    def handle_starttag(self, tag, attrs):
        self.flush()
        a = dict(attrs)
        if tag == "html":
            self.html_lang = a.get("lang")
            if not self.html_lang:
                self.out.append(
                    ("lang-mismatch", self.path, self.getpos()[0], "<html> has no lang")
                )
        skip = (
            tag in self.SKIP
            or a.get("translate") == "no"
            or bool(self.stack and self.stack[-1][2])
        )
        if tag not in self.VOID:
            self.stack.append((tag, a.get("lang"), skip))
        if not skip:
            for key in ("aria-label", "title", "placeholder", "alt"):
                if a.get(key):
                    self.check(a[key], f"{tag}[{key}]")
        if a.get("style"):
            self.styles.append((f"x{{{a['style']}}}", self.getpos()[0]))
        if tag == "style":
            self.in_style = (self.getpos()[0], [])

    def handle_endtag(self, tag):
        self.flush()
        if tag == "style" and self.in_style:
            self.styles.append(("".join(self.in_style[1]), self.in_style[0]))
            self.in_style = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.in_style:
            self.in_style[1].append(data)
        else:
            self.text.append(data)


# --- driver ----------------------------------------------------------------


def files(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
            continue
        for d, dirs, names in os.walk(p):
            dirs[:] = sorted(
                x for x in dirs if x not in SKIP_DIRS and not x.startswith(".")
            )
            for n in sorted(names):
                if n.endswith((".html", ".css")):
                    yield os.path.join(d, n)


def main(argv):
    update = "--update" in argv
    argv = [a for a in argv if a != "--update"]
    tokens, paths = set(), []
    it = iter(argv)
    for a in it:
        if a == "--tokens":
            tokens.add(os.path.normpath(next(it)))
        else:
            paths.append(a)
    if not paths:
        print(__doc__, file=sys.stderr)
        return 2
    # Copies listed in ui-kit.lock.json must equal what was copied (ui-kit-copy.mjs sync);
    # a hand edit is never debt, so it fails outside the allowlist.
    hard = []
    if os.path.exists("ui-kit.lock.json"):
        lock = read_json("ui-kit.lock.json")
        for to, entry in lock.get("files", {}).items():
            if not os.path.exists(to):
                hard.append(f"{to}: missing (ui-kit.lock.json)")
            elif sha256(to) != entry.get("sha256"):
                hard.append(
                    f"{to}: differs from the copy of ui-kit {lock.get('commit')} — never edit a copy; change ui-kit and sync"
                )
        if lock.get("dirty"):
            hard.append(
                "ui-kit.lock.json: copied from uncommitted ui-kit state; commit ui-kit and sync again"
            )
    if hard and not update:
        print("\n".join(hard), file=sys.stderr)
        return 1

    found = []
    for path in files(paths):
        rel = os.path.normpath(os.path.relpath(path))
        text = read_text(path)
        if path.endswith(".css"):
            lint_css(rel, text, 1, rel in tokens, found)
        else:
            page = Page(rel, found)
            page.feed(text)
            page.close()
            for css, line in page.styles:
                lint_css(rel, css, line, rel in tokens, found)

    debt_file = "ui-debt.json"
    debt = (
        read_json(debt_file) if os.path.exists(debt_file) else {"owner": "", "debt": {}}
    )
    counts = {}
    for rule, path, line, msg in found:
        counts.setdefault(rule, {}).setdefault(path, []).append(f"{path}:{line} {msg}")

    problems, lower = [], []
    for rule, by_file in counts.items():
        for path, msgs in by_file.items():
            entry = debt["debt"].get(rule, {}).get(path)
            allowed = entry["count"] if entry else 0
            if len(msgs) > allowed:
                head = (
                    f"{path}: {rule} {len(msgs)} findings, allowlist says {allowed}"
                    if entry
                    else f"{path}: {rule} (not in ui-debt.json)"
                )
                problems.append(head + "\n    " + "\n    ".join(msgs))
    for rule, by_file in debt["debt"].items():
        for path, entry in by_file.items():
            n = len(counts.get(rule, {}).get(path, []))
            if n < entry["count"]:
                lower.append(
                    f"{path}: {rule} now {n}, allowlist says {entry['count']} — debt paid off, lower it (--update)"
                )

    if update:
        if problems and os.environ.get("UI_DEBT_GROW") != "1":
            print("\n".join(problems), file=sys.stderr)
            print(
                "ui_lint: refusing to raise the allowlist (UI_DEBT_GROW=1 for a first baseline only)",
                file=sys.stderr,
            )
            return 1
        nxt = {"owner": debt.get("owner", ""), "debt": {}}
        for rule in sorted(counts):
            for path in sorted(counts[rule]):
                old = debt["debt"].get(rule, {}).get(path, {})
                entry = {
                    "count": len(counts[rule][path]),
                    "owner": old.get("owner", debt.get("owner", "")),
                }
                if old.get("why"):
                    entry["why"] = old["why"]
                nxt["debt"].setdefault(rule, {})[path] = entry
        with open(debt_file, "w", encoding="utf-8") as f:
            json.dump(nxt, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"ui_lint: wrote {debt_file}")
        return 0

    for p in problems + lower:
        print(p, file=sys.stderr)
    if problems or lower:
        print(f"ui_lint: failed ({len(found)} findings)", file=sys.stderr)
        return 1
    print(f"ui_lint: {len(found)} findings, all in the allowlist")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
