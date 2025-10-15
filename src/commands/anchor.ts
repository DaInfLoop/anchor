import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs, StringIndexed } from "@slack/bolt";
import getChannelManagers from "../../lib/getChannelManagers";
import sql from "../../postgres";
import type { AnchorChannelConfig } from "../../types";
import buildConfigView from "../../lib/buildConfigView";

export default async function AnchorMainCommand(ctx: SlackCommandMiddlewareArgs & AllMiddlewareArgs<StringIndexed>) {
    const channelInfo = await (async () => {
        try {
            return await ctx.client.conversations.info({ channel: ctx.payload.channel_id })
        } catch (err) {
            return { ok: false }
        }
    })();
    const user = (await ctx.client.users.info({ user: ctx.payload.user_id })).user!;

    if (!channelInfo.ok) {
        return await ctx.ack({
            response_type: 'ephemeral',
            text: `:warning: *Hey <@${ctx.payload.user_id}>!* Seems like this is a private channel (or a DM), and so you'll need to add me (<@U09JQK9FR6H>) to the channel. I can't anchor messages in a channel I'm not a part of!`
        })
    }

    const channel = channelInfo.channel!

    const channelManagers = await getChannelManagers(channel.id!);

    if (!channelManagers.includes(user.id!) && channel.creator !== user.id!) {
        return await ctx.ack({
            response_type: 'ephemeral',
            text: `:warning: *Hey <@${ctx.payload.user_id}>!* Seems like you aren't a channel manager of <#${channel.id}>. If you want to manage Anchor configuration, ask a channel manager to give you channel manager or ask someone in <#C01D7AHKMPF>.`
        })
    }

    await ctx.ack();

    const config = await (async function (): Promise<AnchorChannelConfig & { is_default?: boolean }> {
        const database_response = await sql<AnchorChannelConfig[]>`SELECT * FROM config WHERE channel_id = ${channel.id!}`;

        if (database_response[0]) {
            return database_response[0];
        }

        return {
            is_default: true,
            channel_id: channel.id!,
            enabled: false,
            rich_text: {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_section',
                        elements: [
                            {
                                type: 'text',
                                text: 'This is the default Anchor config. Change it to your liking!'
                            }
                        ]
                    }
                ]
            },
            user_impersonate: 'U09JQK9FR6H'
        }
    })();

    if (config.is_default && (channel.num_members ?? 0) >= 100) {
        const [ warned ] = await sql<{ warned: boolean }[]>`SELECT EXISTS ( SELECT 1 FROM warnings WHERE channel_id = ${channel.id!} AND large_channel = ${false} ) AS warned`;

        if (!warned) {
            await ctx.client.chat.postEphemeral({
                channel: channel.id!,
                user: ctx.body.user_id,
                text: `:warning: *Hey <@${ctx.payload.user_id}>!* This channel has over 100 members. Anchor isn't built for channels with massive amounts of activity. If you still want to use Anchor, run \`/anchor\` again, but be warned that some things might break (and the bot might also get ratelimited often).`
            })

            await sql`INSERT INTO warnings (channel_id, large_channel)
            VALUES (${channel.id!}, ${true})
            ON CONFLICT DO UPDATE SET
                large_channel = EXCLUDED.large_channel`

            return;
        }
    }

    await ctx.client.views.open({
        trigger_id: ctx.payload.trigger_id,
        view: buildConfigView(config)
    })
}