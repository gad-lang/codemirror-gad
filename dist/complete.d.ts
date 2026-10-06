import { CompletionSource } from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";
/**
 * gadCompletionSource offers Gad keywords, atoms, constants and builtins. It
 * triggers on word boundaries (or an explicit completion request).
 */
export declare const gadCompletionSource: CompletionSource;
/** gadCompletion returns the autocompletion extension for Gad. */
export declare function gadCompletion(): Extension;
