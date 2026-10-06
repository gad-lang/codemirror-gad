import { Extension } from "@codemirror/state";
import type { GadSourceType } from "./index";
/** A positioned diagnostic as returned by the Gad backend (1-based line/col). */
export interface GadDiagnostic {
    line: number;
    column: number;
    message: string;
    severity: "error" | "warning";
}
/**
 * Async source of diagnostics for a Gad document. `sourceType` is the dialect
 * the document is edited as ("gad" | "gadx"), so the backend parses it with the
 * matching front-end instead of always as plain Gad (which would flag valid
 * `.gadx` syntax like `@comp` / `+comp(...)` as errors).
 */
export type DiagnoseFn = (source: string, sourceType?: GadSourceType) => Promise<GadDiagnostic[]> | GadDiagnostic[];
/**
 * gadLinter wires an async diagnose function into CodeMirror's lint system. The
 * diagnose function typically calls the HTTP server (/api/diagnose) or the WASM
 * module (gadDiagnose). Diagnostics are debounced by CodeMirror's linter.
 */
export declare function gadLinter(diagnose: DiagnoseFn, sourceType?: GadSourceType, config?: {
    delay?: number;
}): Extension;
