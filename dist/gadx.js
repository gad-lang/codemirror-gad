import { StreamLanguage, LanguageSupport } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { gadToken, gadTokenTable, newGadState, } from "./language";
// gadxTokenTable extends the Gad token table (reused for embedded Gad inside
// `{= … }` interpolations and `~~ … ~~` code blocks) with the gadx-specific
// markup token kinds. Every gadx token maps to a lezer highlight tag so themes
// colour tags, classes, attributes and control keywords distinctly.
export const gadxTokenTable = {
    ...gadTokenTable,
    gadxTag: t.tagName,
    gadxClass: t.className,
    gadxId: t.attributeName,
    gadxKeyword: t.keyword,
    gadxComponent: t.function(t.variableName),
    gadxComment: t.lineComment,
    gadxDocComment: t.docComment,
    gadxDoctype: t.meta,
    gadxText: t.content,
    gadxFence: t.meta,
    // `{= … }` / `[ … ]` / `|` markers use tagName — the conventional lezer tag
    // for markup/template delimiters (as the Gad-template mode does).
    gadxDelimiter: t.tagName,
};
function newGadxState() {
    return {
        gad: newGadState(),
        code: false,
        blockComment: false,
        interp: 0,
        attrDepth: 0,
        line: "start",
        interpReturn: "text",
    };
}
const isIdentStart = (ch) => /[A-Za-z_]/.test(ch);
const isTagChar = (ch) => /[A-Za-z0-9_-]/.test(ch);
// tokenInterp tokenizes one token inside a `{ … }` / `{= … }` interpolation. The
// `{`/`}` braces are intercepted here to track depth; everything else is
// delegated to the Gad tokenizer so interpolations get full Gad highlighting.
function tokenInterp(stream, state) {
    const ch = stream.peek();
    if (ch === "{") {
        stream.next();
        state.interp++;
        return "operator";
    }
    if (ch === "}") {
        stream.next();
        state.interp--;
        if (state.interp === 0) {
            state.line = state.interpReturn;
            return "gadxDelimiter";
        }
        return "operator";
    }
    return gadToken(stream, state.gad);
}
// enterInterp consumes an opening `{` (and an optional `=` buffered marker) and
// switches to interpolation mode, remembering the mode to resume afterwards.
function enterInterp(stream, state, ret) {
    stream.next(); // '{'
    if (stream.peek() === "=")
        stream.next(); // buffered `{= … }` marker
    state.interp = 1;
    state.interpReturn = ret;
    return "gadxDelimiter";
}
// tokenText tokenizes plain text content, breaking out to interpolation at `{`.
function tokenText(stream, state) {
    if (stream.peek() === "{")
        return enterInterp(stream, state, "text");
    while (!stream.eol() && stream.peek() !== "{")
        stream.next();
    return "gadxText";
}
// tokenHTML tokenizes a raw-HTML line (`<tag …>`): angle brackets are markers,
// `{ … }` interpolates, and the rest is content.
function tokenHTML(stream, state) {
    const ch = stream.peek();
    if (ch === "{")
        return enterInterp(stream, state, "html");
    if (ch === "<" || ch === ">" || ch === "/") {
        stream.next();
        return "gadxDelimiter";
    }
    if (ch === '"' || ch === "'") {
        const q = stream.next();
        while (!stream.eol()) {
            if (stream.next() === q)
                break;
        }
        return "string";
    }
    while (!stream.eol()) {
        const c = stream.peek();
        if (c === "{" || c === "<" || c === ">" || c === "/" || c === '"' || c === "'")
            break;
        stream.next();
    }
    return "gadxText";
}
// tokenAttr tokenizes the inside of a `[ … ]` attribute group: brackets track
// depth (the group may span lines), everything else is Gad (attribute names read
// as variables, `=`, strings, expressions).
function tokenAttr(stream, state) {
    const ch = stream.peek();
    if (ch === "]") {
        stream.next();
        state.attrDepth--;
        if (state.attrDepth === 0)
            state.line = "tagHead";
        return "gadxDelimiter";
    }
    if (ch === "[") {
        stream.next();
        state.attrDepth++;
        return "gadxDelimiter";
    }
    return gadToken(stream, state.gad);
}
// tokenTagHead tokenizes the tag "head": the element name, `.class` and `#id`
// segments and `[ … ]` attribute groups. A space ends the head and the rest of
// the line becomes text.
function tokenTagHead(stream, state) {
    if (stream.eatSpace()) {
        state.line = "text";
        return null;
    }
    const ch = stream.peek();
    if (ch === ".") {
        stream.next();
        while (!stream.eol() && isTagChar(stream.peek()))
            stream.next();
        return "gadxClass";
    }
    if (ch === "#") {
        stream.next();
        while (!stream.eol() && isTagChar(stream.peek()))
            stream.next();
        return "gadxId";
    }
    if (ch === "[") {
        stream.next();
        state.attrDepth = 1;
        state.line = "attr";
        return "gadxDelimiter";
    }
    if (ch === "{")
        return enterInterp(stream, state, "text");
    if (isTagChar(ch)) {
        while (!stream.eol() && isTagChar(stream.peek()))
            stream.next();
        return "gadxTag";
    }
    // Unknown head character: fall back to text.
    state.line = "text";
    return null;
}
// tokenSlotHead tokenizes the head of a dynamic `@slot` directive: an optional
// `#` (pass marker) then the opening `"` of the interpolated name.
function tokenSlotHead(stream, state) {
    if (stream.eatSpace())
        return null;
    const ch = stream.peek();
    if (ch === "#") {
        stream.next();
        return "gadxDelimiter";
    }
    if (ch === '"') {
        stream.next(); // opening quote
        state.line = "slotStr";
        return "string";
    }
    // Not a quoted name after all: hand the rest to the Gad tokenizer.
    state.line = "gad";
    return null;
}
// tokenSlotStr tokenizes the inside of a `"…"` dynamic slot name: `{ … }`
// interpolates as Gad, `\` escapes, and the closing `"` ends the name (the
// trailing `(args)` is then Gad).
function tokenSlotStr(stream, state) {
    const ch = stream.peek();
    if (ch === "{")
        return enterInterp(stream, state, "slotStr");
    if (ch === '"') {
        stream.next(); // closing quote
        state.line = "gad";
        return "string";
    }
    while (!stream.eol()) {
        const c = stream.peek();
        if (c === "{" || c === '"')
            break;
        if (c === "\\") {
            stream.next();
            if (!stream.eol())
                stream.next();
            continue;
        }
        stream.next();
    }
    return "string";
}
// tokenStart dispatches at the beginning of a logical line (after indentation),
// classifying it as a comment, doctype, code fence, pipe-text, raw HTML, control
// keyword (`@…`), component call (`+…`) or a tag line.
function tokenStart(stream, state) {
    if (stream.eatSpace())
        return null;
    if (stream.eol())
        return null;
    // Block comment `/* … */` (silent) / `/** … **/` (doc), only at line start;
    // may span multiple lines.
    if (stream.match("/*")) {
        if (stream.match(/^.*?\*\//))
            return "gadxComment"; // closed on this line
        stream.skipToEnd();
        state.blockComment = true;
        return "gadxComment";
    }
    // `/// …` single-line doc comment (attaches to the next declaration).
    if (stream.match("///")) {
        stream.skipToEnd();
        return "gadxDocComment";
    }
    // Comments: `//` and silent `//-`.
    if (stream.match("//")) {
        stream.skipToEnd();
        return "gadxComment";
    }
    // Doctype: `!!! 5`.
    if (stream.match(/^!!!/)) {
        stream.skipToEnd();
        return "gadxDoctype";
    }
    const ch = stream.peek();
    // Pipe text block: `| plain text`.
    if (ch === "|") {
        stream.next();
        state.line = "text";
        return "gadxDelimiter";
    }
    // Raw HTML line.
    if (ch === "<") {
        state.line = "html";
        return tokenHTML(stream, state);
    }
    // Control keyword: `@main`, `@if`, `@for`, `@var`, `@enum`, `@import`, …
    if (ch === "@") {
        // `@slot "…"` / `@slot #"…"`: a dynamic (interpolated) slot name — highlight
        // the double-quoted name as a template string. A bare `@slot name` falls
        // through to the generic keyword handling below (rest tokenized as Gad).
        if (stream.match(/^@slot(?=\s+#?")/)) {
            state.line = "slotHead";
            return "gadxKeyword";
        }
        stream.next();
        while (!stream.eol() && /[A-Za-z_]/.test(stream.peek()))
            stream.next();
        state.line = "gad"; // the remainder is a Gad expression / declaration
        return "gadxKeyword";
    }
    // Component call: `+comp(...)` / `+mod.comp(...)`.
    if (ch === "+") {
        stream.next();
        while (!stream.eol() && /[A-Za-z0-9_.]/.test(stream.peek()))
            stream.next();
        state.line = "gad";
        return "gadxComponent";
    }
    // Interpolation at line start (bare `{= … }`).
    if (ch === "{")
        return enterInterp(stream, state, "text");
    // Otherwise a tag line (`div`, `.class`, `#id`, `section.hero`, …).
    if (isIdentStart(ch) || ch === "." || ch === "#") {
        state.line = "tagHead";
        return tokenTagHead(stream, state);
    }
    // Fallback.
    stream.next();
    return null;
}
/** gadxToken tokenizes one Gadx token. */
export function gadxToken(stream, state) {
    // Interpolation has top priority (it may span lines).
    if (state.interp > 0)
        return tokenInterp(stream, state);
    // Open `/* … */` block comment body (may span lines): consume up to `*/`.
    if (state.blockComment) {
        if (stream.match(/^.*?\*\//))
            state.blockComment = false;
        else
            stream.skipToEnd();
        return "gadxComment";
    }
    // `~~ … ~~` Gad code block body.
    if (state.code) {
        if (stream.sol() && stream.match(/^\s*~~\s*$/)) {
            state.code = false;
            return "gadxFence";
        }
        return gadToken(stream, state.gad);
    }
    // Reset per-line state at the start of each line, except while a `[ … ]`
    // attribute group is still open (it may span multiple lines).
    if (stream.sol() && state.line !== "attr")
        state.line = "start";
    switch (state.line) {
        case "start": {
            // `~~` on its own line opens a Gad code block.
            if (stream.match(/^\s*~~\s*$/)) {
                state.code = true;
                return "gadxFence";
            }
            return tokenStart(stream, state);
        }
        case "tagHead":
            return tokenTagHead(stream, state);
        case "slotHead":
            return tokenSlotHead(stream, state);
        case "slotStr":
            return tokenSlotStr(stream, state);
        case "attr":
            return tokenAttr(stream, state);
        case "text":
            return tokenText(stream, state);
        case "html":
            return tokenHTML(stream, state);
        case "gad":
            return gadToken(stream, state.gad);
    }
}
const gadxStreamLanguage = StreamLanguage.define({
    name: "gadx",
    startState: newGadxState,
    token: gadxToken,
    tokenTable: gadxTokenTable,
    languageData: { commentTokens: { line: "//" } },
});
/** The Gadx template language (highlighting + comment metadata). */
export const gadxLanguage = gadxStreamLanguage;
/** LanguageSupport bundle for the Gadx language, for plugging into an EditorState. */
export function gadxLanguageSupport() {
    return new LanguageSupport(gadxStreamLanguage);
}
