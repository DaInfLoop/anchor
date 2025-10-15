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

    const config = await (async function (): Promise<AnchorChannelConfig> {
        const database_response = await sql<AnchorChannelConfig[]>`SELECT * FROM config WHERE channel_id = ${channel.id!}`;

        if (database_response[0]) {
            return database_response[0];
        }

        return {
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

    await ctx.client.views.open({
        trigger_id: ctx.payload.trigger_id,
        view: buildConfigView(config)
    })
}