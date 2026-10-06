import { autocompletion, } from "@codemirror/autocomplete";
import { atoms, builtins, constants, keywords } from "./keywords";
function options() {
    const out = [];
    for (const k of keywords)
        out.push({ label: k, type: "keyword" });
    for (const a of atoms)
        out.push({ label: a, type: "constant" });
    for (const c of constants)
        out.push({ label: c, type: "constant" });
    for (const b of builtins)
        out.push({ label: b, type: "function" });
    return out;
}
const staticOptions = options();
/**
 * gadCompletionSource offers Gad keywords, atoms, constants and builtins. It
 * triggers on word boundaries (or an explicit completion request).
 */
export const gadCompletionSource = (context) => {
    const word = context.matchBefore(/[\w$]+/);
    if (!word && !context.explicit)
        return null;
    const from = word ? word.from : context.pos;
    return {
        from,
        options: staticOptions,
        validFor: /^[\w$]*$/,
    };
};
/** gadCompletion returns the autocompletion extension for Gad. */
export function gadCompletion() {
    return autocompletion({ override: [gadCompletionSource] });
}
