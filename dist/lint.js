import { linter } from "@codemirror/lint";
/**
 * Convert a 1-based line/column to an absolute document offset, clamping to
 * valid bounds so a stale or off-by-one position never throws.
 */
function offsetOf(view, line, column) {
    const doc = view.state.doc;
    const lineNo = Math.min(Math.max(line, 1), doc.lines);
    const l = doc.line(lineNo);
    const col = Math.min(Math.max(column - 1, 0), l.length);
    return l.from + col;
}
/**
 * gadLinter wires an async diagnose function into CodeMirror's lint system. The
 * diagnose function typically calls the HTTP server (/api/diagnose) or the WASM
 * module (gadDiagnose). Diagnostics are debounced by CodeMirror's linter.
 */
export function gadLinter(diagnose, sourceType, config) {
    return linter(async (view) => {
        const source = view.state.doc.toString();
        let diags;
        try {
            diags = await diagnose(source, sourceType);
        }
        catch (e) {
            // Surface backend failures as a single document-level error.
            return [
                {
                    from: 0,
                    to: Math.min(1, view.state.doc.length),
                    severity: "error",
                    message: `diagnostics unavailable: ${String(e)}`,
                },
            ];
        }
        return diags.map((d) => {
            const from = offsetOf(view, d.line, d.column);
            const line = view.state.doc.lineAt(from);
            const to = Math.min(line.to, from + 1);
            return {
                from,
                to: to > from ? to : from,
                severity: d.severity === "warning" ? "warning" : "error",
                message: d.message,
            };
        });
    }, { delay: config?.delay ?? 300 });
}
