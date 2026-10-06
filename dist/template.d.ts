import { StreamLanguage } from "@codemirror/language";
import { GadState } from "./language";
/** Delimiters for the code/value tags. Defaults to `{%` / `%}`. */
export interface GadTemplateDelimiters {
    start?: string;
    end?: string;
}
interface GadtState {
    gad: GadState;
    inTag: boolean;
    preamble: boolean;
}
/**
 * gadTemplateLanguage builds a StreamLanguage that highlights a Gad template:
 * literal text plus `{% … %}` / `{%= … %}` tags whose bodies are tokenized as
 * Gad. The tag delimiters are taken from `delims` (defaulting to `{%` / `%}`).
 *
 * When `preamble` is set, the document starts as ordinary Gad and switches to
 * template text only after a `# gad:` config directive line — matching a `.gad`
 * file that enables mixed mode with `# gad: mixed` (as opposed to a `.gadt`
 * file, which is template from the first byte).
 */
export declare function gadTemplateLanguage(delims?: GadTemplateDelimiters, preamble?: boolean): StreamLanguage<GadtState>;
export {};
