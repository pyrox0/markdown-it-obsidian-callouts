import type MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";
import type { MdItObsidianCalloutsOptions } from "./@types/index.ts";

const callout = /^\[!([^\]]+)\](\+|-|) *(.*)? */;
const admonition = /^ad-([^\s]+) */;
const admonitionHeader = /^(title|collapse|icon|color):(.*)/;
const headerToAttr: Record<string, string> = {
    title: "data-callout-title",
    icon: "data-callout-icon",
    color: "data-callout-color",
};

export function inspectFencedCodeContent(
    tokens: Token[],
    startIdx: number,
    md: MarkdownIt,
    options: MdItObsidianCalloutsOptions,
) {
    const token = tokens[startIdx];
    if (!token.info) {
        return "";
    }
    const match = token.info
        .replace(options.langPrefix || "", "")
        .match(admonition);
    if (match) {
        token.type = "admonition_block";
        token.attrPush(["class", "callout"]);
        token.attrPush(["data-callout", match[1].toLowerCase()]);

        // Split the content by newline
        // Iterate over lines:
        // if the line matches an admontion header, add the attribute and remove the line
        // otherwise, stop iterating
        let lines = token.content.split("\n");
        while (lines.length > 0 && admonitionHeader.test(lines[0])) {
            const match = lines[0].match(admonitionHeader);
            if (match) {
                const attrName = headerToAttr[match[1].trim().toLowerCase()];
                if (attrName) {
                    token.attrPush([attrName, match[2].trim()]);
                }
                lines = lines.slice(1);
            } else {
                break;
            }
        }

        // render the fenced content.
        token.content = md.render(lines.join("\n"), {});
    }
}

export function inspectBlockquoteContent(iterable: Token[], startIdx: number) {
    let content = "";
    let blockquoteDepth = 0;
    let endIdx = startIdx;
    let contentIdx = startIdx;

    // Iterate over the tokens starting from startIdx
    for (let i = startIdx; i < iterable.length; i++) {
        const token = iterable[i];

        if (token.type === "blockquote_open") {
            blockquoteDepth++;
        } else if (token.type === "blockquote_close") {
            endIdx = i;
            blockquoteDepth--;
        }

        // TODO: with rule, nested blockquotes may never be a thing
        if (blockquoteDepth === 0) {
            break;
            // biome-ignore lint/style/noUselessElse: blockquoteDepth can be 1
        } else if (blockquoteDepth > 1) {
            continue;
        }

        if (token.type === "inline") {
            if (contentIdx === startIdx && token.content.match(callout)) {
                contentIdx = i;
            }
            // If the token is a text token, append its content to content
            content = content + token.content;
        } else if (token.type === "paragraph_close") {
            // If the token is a paragraph_close token, append a newline to content
            content += "\n";
        }
    }

    const match = content.match(callout);
    if (match && startIdx !== endIdx) {
        const calloutType = match[1].toLowerCase();
        const calloutFold = match[2];
        const calloutTitle = match[3];

        iterable[startIdx].type = "callout_open";
        iterable[startIdx].attrPush(["class", "callout"]);
        iterable[startIdx].attrPush(["data-callout", calloutType]);
        iterable[startIdx].attrPush(["data-callout-fold", calloutFold]);
        if (calloutTitle) {
            iterable[startIdx].attrPush(["data-callout-title", calloutTitle]);
        }

        iterable[endIdx].type = "callout_close";
        iterable[endIdx].attrPush(["data-callout", calloutType]);
        iterable[endIdx].attrPush(["data-callout-fold", calloutFold]);

        if (
            contentIdx !== startIdx &&
            iterable[contentIdx] &&
            iterable[contentIdx].children
        ) {
            iterable[contentIdx].content = iterable[contentIdx].content
                .replace(callout, "")
                .trim();
        }
    }
}

export function renderCalloutPrefix(
    token: Token,
    md: MarkdownIt,
    options: MdItObsidianCalloutsOptions = {},
): string {
    const callout = token.attrGet("data-callout");
    const fold = token.attrGet("data-callout-fold");
    const foldClass = fold ? "" : "no-fold";
    // deno-fmt-ignore
    if (callout) {
        return `
<details class="callout ${foldClass}" open data-callout="${callout}">
    <summary class="callout-title ${foldClass}">
        ${getTitle(token, md)}
    </summary>
    <div class="callout-content">`;
    }
    return "";
}

export function renderCalloutPostfix(
    token: Token,
    options: MdItObsidianCalloutsOptions = {},
): string {
    const callout = token.attrGet("data-callout");
    if (callout) {
        return "</div></details>";
    }
    return "";
}

function getTitle(token: Token, md: MarkdownIt) {
    const title = token.attrGet("data-callout-title");
    if (title) {
        // Use the md instance passed upon plugin definition
        return md.renderInline(title.trim());
    }
    const callout = token.attrGet("data-callout");
    if (callout) {
        return toTitleCase(callout);
    }
    return "";
}

function toTitleCase(str: string) {
    return str
        .split(" ")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");
}
