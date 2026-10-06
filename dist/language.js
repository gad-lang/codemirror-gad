import { StreamLanguage, LanguageSupport } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { atoms, builtins, constants, keywords } from "./keywords";
const keywordSet = new Set(keywords);
const atomSet = new Set(atoms);
const constantSet = new Set(constants);
const builtinSet = new Set(builtins);
const isIdentStart = (ch) => /[A-Za-z_$]/.test(ch);
const isIdent = (ch) => /[A-Za-z0-9_$]/.test(ch);
/** gadTokenTable maps the tokenizer's token names to highlight tags. Shared by
 * the Gad and Gad-template languages. */
export const gadTokenTable = {
    lineComment: t.lineComment,
    blockComment: t.blockComment,
    docComment: t.docComment,
    docCodeFence: t.meta,
    docResult: t.special(t.comment),
    string: t.string,
    character: t.character,
    number: t.number,
    keyword: t.keyword,
    atom: t.atom,
    standard: t.standard(t.variableName),
    builtin: t.function(t.variableName),
    variable: t.variableName,
    operator: t.operator,
    // Template (mixed) additions. The `{%` / `%}` (and `=` / `-` marker)
    // delimiters use `tagName` — the conventional lezer tag for markup/template
    // tag delimiters (as CodeMirror's Jinja2/Django/HTML modes do). Every theme
    // colours `tagName` distinctly, so the delimiters stand out from the literal
    // text and from the keywords inside the tag, with no hard-coded colour.
    tagDelimiter: t.tagName,
    tagContent: t.content,
    // The `# gad: …` config directive that enables mixed mode in a `.gad` file.
    templateDirective: t.meta,
};
// A pragmatic stream tokenizer for Gad. It is intentionally lightweight (it
// does not build a full syntax tree) but covers comments, the several string
// forms, char/number literals, keywords, builtins and operators well enough for
// editor highlighting.
//
// Doc-comment blocks additionally highlight embedded ``` code fences as normal
// Gad code and `>>> ` result assertion lines as a distinct token.
//
// Template strings (#"…" / #`…` / #"""…""" / #```…```) highlight `{expr}`
// interpolation regions as normal Gad code, giving autocomplete and hover
// tooltips inside interpolations.
const gadStreamLanguage = StreamLanguage.define({
    name: "gad",
    startState: newGadState,
    token: gadToken,
    tokenTable: gadTokenTable,
});
/** newGadState returns a fresh Gad tokenizer state (StreamLanguage startState). */
export function newGadState() {
    return { blockComment: 0, docFence: "", docCodeFence: "", tmplClose: "", tmplDepth: 0 };
}
/** gadInContinuation reports whether the tokenizer is mid-way through a
 * multi-token construct (block comment, doc block or template string) that must
 * be finished before any surrounding context (e.g. a template `%}` delimiter)
 * can be considered. */
export function gadInContinuation(state) {
    return state.blockComment > 0 || state.docFence !== "" || state.tmplClose !== "";
}
/** gadToken tokenizes one Gad token. Exported so the template (mixed) language
 * can reuse the exact Gad highlighting inside `{% … %}` tags. */
export function gadToken(stream, state) {
    // Template string code interpolation (`{expr}`) — highest priority.
    if (state.tmplClose && state.tmplDepth > 0) {
        return tokenTmplCode(stream, state);
    }
    // Template string text region — second priority.
    if (state.tmplClose) {
        return tokenTmplText(stream, state);
    }
    // Inside a code fence within a doc-comment block: tokenize as Gad code.
    if (state.docFence && state.docCodeFence) {
        return tokenDocCodeBlock(stream, state);
    }
    // Inside a doc-comment block (not a code fence): consume as doc text.
    if (state.docFence) {
        return tokenDocBlock(stream, state);
    }
    // Inside a block comment.
    if (state.blockComment > 0) {
        return tokenBlockComment(stream, state);
    }
    if (stream.eatSpace())
        return null;
    const ch = stream.peek();
    // Doc comments come before the ordinary // and /* checks so their markers are
    // not read as plain `//`/`/*` comments: `///` single-line, and the unified
    // `/** … **/` block (three-star `/*** … ***/` is deprecated but recognized).
    // A block's OPENING fence must be ALONE on its line — only whitespace before
    // and after it — so an inline `/** text **/` (and the `/**= … **/` / `/**< … **/`
    // doc-generation markers) is an ordinary comment, not a doc block.
    const openAlone = /^[ \t]*$/.test(stream.string.slice(0, stream.pos));
    if (openAlone && stream.match(/^\/\*\*\*(?=[ \t]*$)/)) {
        state.docFence = "***/";
        return tokenDocBlock(stream, state);
    }
    if (openAlone && stream.match(/^\/\*\*(?=[ \t]*$)/)) {
        state.docFence = "**/";
        return tokenDocBlock(stream, state);
    }
    if (stream.match(/^\/\/\/(?!\/)/)) {
        stream.skipToEnd();
        return "docComment";
    }
    // Delegate all non-comment, non-doc-comment tokens to the shared helper so
    // the same logic is reused when highlighting code inside doc-code fences
    // and template string interpolations.
    return tokenCodeLine(stream, state, ch);
}
// tokenTmplText handles one token while inside a template string TEXT region
// (outside any `{…}` interpolation). It:
//   - closes multi-line heredocs when the closing fence appears at line start
//   - transitions to code mode when it sees `{` (sets tmplDepth=1)
//   - ends the string when it sees the matching closing delimiter
//   - handles escape sequences for interpreted (non-raw) template strings
//   - consumes plain text characters up to the next special position
function tokenTmplText(stream, state) {
    const isHeredoc = state.tmplClose === '"""' || state.tmplClose === "```";
    const isRaw = state.tmplClose === "`" || state.tmplClose === "```";
    // Multi-line heredoc: closing fence must appear at the start of a line.
    if (isHeredoc && stream.sol()) {
        if (stream.match(state.tmplClose)) {
            state.tmplClose = "";
            return "string";
        }
    }
    // Open a code interpolation.
    if (stream.peek() === "{") {
        stream.next();
        state.tmplDepth = 1;
        return "operator";
    }
    // Single-line closing delimiter.
    if (!isHeredoc && stream.peek() === state.tmplClose) {
        stream.next();
        state.tmplClose = "";
        return "string";
    }
    // Escape sequence in interpreted strings.
    if (!isRaw && stream.peek() === "\\") {
        stream.next();
        if (!stream.eol())
            stream.next();
        return "string";
    }
    // Consume plain string text up to the next `{`, escape, closing delimiter, or EOL.
    while (!stream.eol()) {
        const c = stream.peek();
        if (c === "{")
            break;
        if (!isHeredoc && c === state.tmplClose)
            break;
        if (!isRaw && c === "\\")
            break;
        stream.next();
    }
    return "string";
}
// tokenTmplCode handles one token while inside a template string `{…}` code
// interpolation. It intercepts `{` (increments depth) and `}` (decrements
// depth, returning to text mode when depth reaches 0), and delegates everything
// else to tokenCodeLine so the full Gad editor features apply.
function tokenTmplCode(stream, state) {
    const ch = stream.peek();
    if (ch === "{") {
        stream.next();
        state.tmplDepth++;
        return "operator";
    }
    if (ch === "}") {
        stream.next();
        state.tmplDepth--;
        return "operator";
    }
    // Block comment open/close inside the interpolation.
    if (state.blockComment > 0) {
        return tokenBlockComment(stream, state);
    }
    // Full Gad code tokenization (no doc-comment detection, correct string
    // handling so nested strings consume `{}`/`}` without confusing tmplDepth).
    return tokenCodeLine(stream, state, ch);
}
// tokenDocBlock handles one token while inside a `/**`…`**/` (or `/***`…`***/`)
// doc-comment block but outside any embedded code fence. On each line it checks:
//   - whether the line is the outer closing fence (resets docFence)
//   - whether the line starts a ``` code fence (sets docCodeFence)
// Everything else is consumed to end-of-line as "docComment".
function tokenDocBlock(stream, state) {
    if (stream.sol()) {
        const rest = stream.string.slice(stream.pos);
        if (rest.trim() === state.docFence) {
            state.docFence = "";
            stream.skipToEnd();
            return "docComment";
        }
        if (rest.match(/^[ \t]*```/)) {
            state.docCodeFence = "```";
            stream.skipToEnd();
            return "docCodeFence";
        }
    }
    stream.skipToEnd();
    return "docComment";
}
// tokenDocCodeBlock handles one token while inside a ``` fence within a doc-
// comment block. Closing ``` lines reset docCodeFence; `>>> ` lines are tagged
// as docResult; everything else is delegated to tokenCodeLine (gad code, without
// doc-comment marker detection so `///` / `/**` are not treated as doc openers).
function tokenDocCodeBlock(stream, state) {
    if (stream.sol()) {
        const rest = stream.string.slice(stream.pos);
        if (rest.match(/^[ \t]*```/)) {
            state.docCodeFence = "";
            stream.skipToEnd();
            return "docCodeFence";
        }
        if (rest.match(/^>>> /)) {
            stream.skipToEnd();
            return "docResult";
        }
    }
    // Block comment open/close inside the code fence.
    if (state.blockComment > 0) {
        return tokenBlockComment(stream, state);
    }
    // Normal gad code (no doc-comment detection).
    return tokenCodeLine(stream, state, stream.peek());
}
// tokenCodeLine tokenizes one normal Gad code token. Shared between the main
// token() path, doc-code-fence regions and template string interpolations so
// all three contexts get full Gad highlighting. Does NOT handle doc-comment
// markers (`///`, `/**`, `/***`) — those are matched at a higher level.
//
// Template string openers (#"…", #`…`, #"""…""", #```…```) are handled here
// so they work inside doc-code fences and interpolations too.
function tokenCodeLine(stream, state, ch) {
    if (stream.eatSpace())
        return null;
    // Comments (no doc-comment variants here — `///` → lineComment in code context)
    if (stream.match("//")) {
        stream.skipToEnd();
        return "lineComment";
    }
    if (stream.match("/*")) {
        state.blockComment = 1;
        return tokenBlockComment(stream, state);
    }
    // Template strings: #"…", #`…`, #"""…""", #```…```.
    // Must come before plain string/heredoc handling below.
    if (ch === "#") {
        const next = stream.string[stream.pos + 1];
        if (next === '"' || next === "`") {
            stream.next(); // '#'
            const q = stream.next(); // '"' or '`'
            // Triple-quote heredoc variant.
            if (q === '"' &&
                stream.peek() === '"' &&
                stream.string[stream.pos + 1] === '"') {
                stream.next();
                stream.next();
                state.tmplClose = '"""';
            }
            else if (q === "`" &&
                stream.peek() === "`" &&
                stream.string[stream.pos + 1] === "`") {
                stream.next();
                stream.next();
                state.tmplClose = "```";
            }
            else {
                state.tmplClose = q;
            }
            state.tmplDepth = 0;
            return "string";
        }
    }
    // Heredocs and raw strings (non-template)
    if (stream.match('"""') || stream.match("```")) {
        return tokenFenced(stream, ch === '"' ? '"""' : "```");
    }
    // Strings
    if (ch === '"') {
        stream.next();
        tokenString(stream, '"');
        return "string";
    }
    if (ch === "`") {
        stream.next();
        tokenRawString(stream);
        return "string";
    }
    if (ch === "'") {
        stream.next();
        tokenString(stream, "'");
        return "character";
    }
    // Numbers (incl. hex, suffixes u/d, decimals)
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(stream.string[stream.pos + 1] ?? ""))) {
        stream.match(/^0[xX][0-9a-fA-F]+/) ||
            stream.match(/^[0-9]+\.[0-9]*([eE][-+]?[0-9]+)?[dD]?/) ||
            stream.match(/^\.[0-9]+([eE][-+]?[0-9]+)?/) ||
            stream.match(/^[0-9]+([eE][-+]?[0-9]+)?[uUdD]?/);
        return "number";
    }
    // Bytes literals: b"..."/h"..." (and raw/back-tick forms)
    if ((ch === "b" || ch === "h") && /["`]/.test(stream.string[stream.pos + 1] ?? "")) {
        stream.next(); // prefix
        const q = stream.next();
        if (q === "`")
            tokenRawString(stream);
        else
            tokenString(stream, q);
        return "string";
    }
    // Identifiers / keywords / builtins
    if (isIdentStart(ch)) {
        let word = "";
        while (!stream.eol() && isIdent(stream.peek())) {
            word += stream.next();
        }
        if (keywordSet.has(word))
            return "keyword";
        if (atomSet.has(word))
            return "atom";
        if (constantSet.has(word))
            return "standard";
        if (builtinSet.has(word))
            return "builtin";
        return "variable";
    }
    // @-prefixed special idents (@args, @module, ...)
    if (ch === "@") {
        stream.next();
        while (!stream.eol() && isIdent(stream.peek()))
            stream.next();
        return "standard";
    }
    // Operators / punctuation
    if (/[-+*/%<>=!&|^~?:.,;(){}\[\]]/.test(ch)) {
        stream.next();
        return "operator";
    }
    stream.next();
    return null;
}
function tokenBlockComment(stream, state) {
    while (!stream.eol()) {
        if (stream.match("*/")) {
            state.blockComment = 0;
            return "blockComment";
        }
        stream.next();
    }
    return "blockComment";
}
function tokenString(stream, quote) {
    let escaped = false;
    while (!stream.eol()) {
        const c = stream.next();
        if (c === quote && !escaped)
            return;
        escaped = !escaped && c === "\\";
    }
}
function tokenRawString(stream) {
    while (!stream.eol()) {
        if (stream.next() === "`")
            return;
    }
}
function tokenFenced(stream, fence) {
    while (!stream.eol()) {
        if (stream.match(fence))
            return "string";
        stream.next();
    }
    return "string";
}
/** The Gad language (highlighting + comment metadata). */
export const gadLanguage = gadStreamLanguage;
/** LanguageSupport bundle for plugging into an EditorState. */
export function gadLanguageSupport() {
    return new LanguageSupport(gadStreamLanguage);
}
