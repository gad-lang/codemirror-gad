import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";
import { GadState } from "./language";
export declare const gadxTokenTable: {
    gadxTag: import("@lezer/highlight").Tag;
    gadxClass: import("@lezer/highlight").Tag;
    gadxId: import("@lezer/highlight").Tag;
    gadxKeyword: import("@lezer/highlight").Tag;
    gadxComponent: import("@lezer/highlight").Tag;
    gadxComment: import("@lezer/highlight").Tag;
    gadxDocComment: import("@lezer/highlight").Tag;
    gadxDoctype: import("@lezer/highlight").Tag;
    gadxText: import("@lezer/highlight").Tag;
    gadxFence: import("@lezer/highlight").Tag;
    gadxDelimiter: import("@lezer/highlight").Tag;
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
type LineMode = "start" | "tagHead" | "attr" | "text" | "html" | "gad" | "slotHead" | "slotStr";
/** GadxState is the StreamLanguage state for the Gadx template language. */
export interface GadxState {
    gad: GadState;
    code: boolean;
    blockComment: boolean;
    interp: number;
    attrDepth: number;
    line: LineMode;
    interpReturn: LineMode;
}
/** gadxToken tokenizes one Gadx token. */
export declare function gadxToken(stream: StringStream, state: GadxState): string | null;
/** The Gadx template language (highlighting + comment metadata). */
export declare const gadxLanguage: StreamLanguage<GadxState>;
/** LanguageSupport bundle for the Gadx language, for plugging into an EditorState. */
export declare function gadxLanguageSupport(): LanguageSupport;
export {};
