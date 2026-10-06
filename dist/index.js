// @gad-lang/codemirror-gad — CodeMirror 6 support for the Gad language.
//
// Combine highlighting, autocompletion and async diagnostics with the `gad()`
// helper, or import the individual pieces.
import { LanguageSupport } from "@codemirror/language";
import { gadCompletion } from "./complete";
import { gadLanguageSupport } from "./language";
import { gadxLanguageSupport } from "./gadx";
import { gadTemplateLanguage } from "./template";
import { gadLinter } from "./lint";
import { gadHoverTooltip } from "./hover";
export { gadLanguage, gadLanguageSupport } from "./language";
export { gadxLanguage, gadxLanguageSupport, gadxToken } from "./gadx";
export { gadCompletion, gadCompletionSource } from "./complete";
export { gadLinter } from "./lint";
export { keywords, builtins, atoms, constants } from "./keywords";
export { gadHoverTooltip } from "./hover";
/**
 * gad returns a bundled extension: the language (highlighting) for the requested
 * `sourceType`, optional autocompletion, optional hover tooltips for builtins,
 * and an optional async linter. Set `sourceType: "template"` for `.gadt` (mixed)
 * files — with `delimiters` to change the `{%` / `%}` tags — or `"gadx"` for
 * `.gadx` templates. Autocompletion and hover work inside tags/interpolations
 * too; the linter is skipped for `"template"`.
 */
export function gad(options = {}) {
    const sourceType = options.sourceType ?? "gad";
    let language;
    switch (sourceType) {
        case "template":
            language = new LanguageSupport(gadTemplateLanguage(options.delimiters, options.preamble));
            break;
        case "gadx":
            language = gadxLanguageSupport();
            break;
        default:
            language = gadLanguageSupport();
    }
    const ext = [language];
    if (options.completion !== false)
        ext.push(gadCompletion());
    if (options.hover !== false)
        ext.push(gadHoverTooltip());
    if (options.diagnose && sourceType !== "template") {
        ext.push(gadLinter(options.diagnose, sourceType, { delay: options.lintDelay }));
    }
    return ext;
}
/**
 * gadx returns a bundled extension for `.gadx` templates. It is a convenience
 * wrapper for `gad({ ...options, sourceType: "gadx" })`: the Gadx language
 * (indentation-based tags, `.class`/`#id`, `[attr]` groups, `@`-control
 * keywords, `+`component calls and `{= … }` interpolations), with optional Gad
 * autocompletion, hover tooltips and async diagnostics that apply to the
 * embedded Gad code inside interpolations and `~~` blocks.
 */
export function gadx(options = {}) {
    return gad({ ...options, sourceType: "gadx" });
}
