import type { AllMiddlewareArgs, SlackEventMiddlewareArgs, StringIndexed } from "@slack/bolt";
import type { AnchorLastAnchored, AnchorChannelConfig } from '../../types';
import richTextToMrkdwn from "../../lib/richTextToMrkdwn";
import sql from '../../postgres';

// [Maintainers notice: this isn't an exhaustive list of message subtypes! Feel free to PR some in.]
const VALID_MESSAGE_SUBTYPES: SlackEventMiddlewareArgs<"message">['message']['subtype'][] = [
    "bot_message", // For legacy Slack bots
    "file_share", // When a file is sent alongside a message
    "me_message", // /me has its own message type, for some reason
    "thread_broadcast", // Sending to channel from a thread
    undefined
]

export default async function MessageEvent(ctx: SlackEventMiddlewareArgs<"message"> & AllMiddlewareArgs<StringIndexed>) {
    if (!["channel", "group"].includes(ctx.message.channel_type)) return;
    if (!VALID_MESSAGE_SUBTYPES.includes(ctx.message.subtype)) return;

    const message = await ctx.client.conversations.history({
        channel: ctx.message.channel,
        latest: ctx.message.ts,
        inclusive: true,
        limit: 1
    });

    if (message.messages && message.messages[0]) {
        if (message.messages[0].thread_ts !== message.messages[0].ts) return;
    }

    const config = await sql<AnchorChannelConfig[]>`SELECT * FROM config WHERE channel_id = ${ctx.message.channel}`;

    if (!config[0] || !config[0].enabled) return;

    const last_anchored_message = await sql<AnchorLastAnchored[]>`SELECT * FROM last_anchored_message WHERE channel_id = ${ctx.message.channel}`;

    if (last_anchored_message[0]) {
        await ctx.client.pins.remove({
            channel: ctx.message.channel,
            timestamp: last_anchored_message[0].ts
        })
        await ctx.client.chat.delete({
            channel: ctx.message.channel,
            ts: last_anchored_message[0].ts
        })
    }

    const userImpersonate = {
        username: "Anchor",
        avatarUrl: 'https://ca.slack-edge.com/T0266FRGM-U09JQK9FR6H-0246c2947d93-1024'
    };

    if (config[0].user_impersonate !== "U09JQK9FR6H") {
        const getUserInfo = await ctx.client.users.profile.get({ user: config[0].user_impersonate });

        if (getUserInfo.ok && getUserInfo.profile) {
            userImpersonate.username = (getUserInfo.profile.display_name || getUserInfo.profile.real_name)!
            userImpersonate.avatarUrl = `https://ca.slack-edge.com/T0266FRGM-${config[0].user_impersonate}-${getUserInfo.profile.avatar_hash}-1024`
        }
    }

    const resp = await ctx.client.chat.postMessage({
        channel: config[0].channel_id,
        text: await richTextToMrkdwn(config[0].rich_text),
        blocks: [
            config[0].rich_text
        ],
        username: userImpersonate.username,
        icon_url: userImpersonate.avatarUrl
    });

    if (resp.ok && resp.ts) {
        await sql`INSERT INTO last_anchored_message (channel_id, ts)
        VALUES (
            ${config[0].channel_id}, 
            ${resp.ts}
        )
        ON CONFLICT (channel_id) DO UPDATE SET
            ts = EXCLUDED.ts`

        ctx.client.pins.add({
            channel: config[0].channel_id,
            timestamp: resp.ts
        })
    }
}