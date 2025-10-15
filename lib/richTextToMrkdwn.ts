import type { RichTextBlock, RichTextElement } from "@slack/web-api";

async function handleRichTextSection(section: { elements: RichTextElement[] }) {
    let text = "";
    for (let el of section.elements) {
        let txt = "";
        switch (el.type) {
            case 'broadcast':
                txt += `@${el.range}`;
                break;

            case 'color':
                txt += `#${el.value}`;
                break;

            case 'emoji':
                txt += `:${el.name}:`;
                break;

            case 'link':
                if (el.text) {
                    txt += `<${el.url}|${el.text}>`;
                } else {
                    txt += `${el.url}`
                }
                break;

            case 'text':
                txt += el.text;
                break;

            case 'channel':
                txt += `<#${el.channel_id}>`

                break;

            case 'date':
                txt += `[timestamp: ${el.timestamp}]`;
                break;

            case 'user':
                txt += `<@${el.user_id}>`
                break;

            case 'team':
                txt += `[team: ${el.team_id}]`
                break;

            case 'usergroup':
                txt += `<!subteam^${el.usergroup_id}>`
                break;
        }

        if (el.style) {
            if (el.style.bold)
                txt = `**${txt}**`;

            if (el.style.italic)
                txt = `*${txt}*`;

            if (el.style.strike)
                txt = `~~${txt}~~`;

            if (el.style.code)
                txt = `\`${txt}\``;
        }

        text += txt;
    }

    return text;
}

export default async function richTextToMrkdwn(rich_text: RichTextBlock) {
    let text = "";
    for (let _ of rich_text.elements) {
        if (_.type == "rich_text_section") {
            text += await handleRichTextSection(_);
        }

        if (_.type == "rich_text_quote") {
            (
                await handleRichTextSection(_)
            ).split('\n').forEach(_ =>
                text += `> ${_}\n`
            );
        }

        if (_.type == "rich_text_preformatted") {
            text += "```" + _.elements.map(el => el.text).join('') + "```"
        }

        if (_.type == "rich_text_list") {
            for (let i in _.elements) {
                const item = _.elements[i]!;
                text += `${_.style == "ordered" ? `${i + 1}.` : '-'} ${await handleRichTextSection(item)}\n`;
            }
        }

        text = text.trim()

        text += "\n";
    }
    return text.trim()
}