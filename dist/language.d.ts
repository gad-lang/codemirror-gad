import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";
export interface GadState {
    blockComment: number;
    docFence: string;
    docCodeFence: string;
    tmplClose: string;
    tmplDepth: number;
}
/** gadTokenTable maps the tokenizer's token names to highlight tags. Shared by
 * the Gad and Gad-template languages. */
export declare const gadTokenTable: {
    lineComment: import("@lezer/highlight").Tag;
    blockComment: import("@lezer/highlight").Tag;
    docComment: import("@lezer/highlight").Tag;
    docCodeFence: import("@lezer/highlight").Tag;
    docResult: import("@lezer/highlight").Tag;
    string: import("@lezer/highlight").Tag;
    character: import("@lezer/highlight").Tag;
    number: import("@lezer/highlight").Tag;
    keyword: import("@lezer/highlight").Tag;
    atom: import("@lezer/highlight").Tag;
    standard: import("@lezer/highlight").Tag;
    builtin: import("@lezer/highlight").Tag;
    variable: import("@lezer/highlight").Tag;
    operator: import("@lezer/highlight").Tag;
    tagDelimiter: import("@lezer/highlight").Tag;
    tagContent: import("@lezer/highlight").Tag;
    templateDirective: import("@lezer/highlight").Tag;
};
/** newGadState returns a fresh Gad tokenizer state (StreamLanguage startState). */
export declare function newGadState(): GadState;
/** gadInContinuation reports whether the tokenizer is mid-way through a
 * multi-token construct (block comment, doc block or template string) that must
 * be finished before any surrounding context (e.g. a template `%}` delimiter)
 * can be considered. */
export declare function gadInContinuation(state: GadState): boolean;
/** gadToken tokenizes one Gad token. Exported so the template (mixed) language
 * can reuse the exact Gad highlighting inside `{% … %}` tags. */
export declare function gadToken(stream: StringStream, state: GadState): string | null;
/** The Gad language (highlighting + comment metadata). */
export declare const gadLanguage: StreamLanguage<GadState>;
/** LanguageSupport bundle for plugging into an EditorState. */
export declare function gadLanguageSupport(): LanguageSupport;
