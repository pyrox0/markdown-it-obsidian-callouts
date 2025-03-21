// Import the MarkdownIt type from 'markdown-it'
import type MarkdownIt from "markdown-it";
import type { MdItObsidianCalloutsOptions } from "./@types/index.ts";
import {
    inspectBlockquoteContent,
    inspectFencedCodeContent,
    renderCalloutPostfix,
    renderCalloutPrefix,
} from "./inspect.ts";

// Define your plugin
export default function mdItObsidianCallouts(
    md: MarkdownIt,
    options: MdItObsidianCalloutsOptions = {},
): void {
    md.core.ruler.after("block", "obsidian-callouts", (state) => {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === "blockquote_open") {
                inspectBlockquoteContent(tokens, i);
            }
            if (token.type === "fence") {
                inspectFencedCodeContent(tokens, i, md, options);
            }
        }
    });

    md.renderer.rules.callout_open = (tokens, idx) => {
        const token = tokens[idx];
        return renderCalloutPrefix(token, md, options);
    };

    md.renderer.rules.admonition_block = (tokens, idx) => {
        const token = tokens[idx];
        return `${
            renderCalloutPrefix(token, md, options)
        }${token.content}\n</div>\n</div>`;
    };

    md.renderer.rules.callout_close = (tokens, idx) => {
        const token = tokens[idx];
        return renderCalloutPostfix(token, options);
    };
}
