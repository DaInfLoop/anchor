import type { AllMiddlewareArgs, SlackViewAction, SlackViewMiddlewareArgs, StringIndexed } from "@slack/bolt";
import type { AnchorChannelConfig } from "../../types";
import sql from "../../postgres";
import type { Button, SectionBlock } from "@slack/web-api";

export default async function ConfigViewSubmit(ctx: SlackViewMiddlewareArgs<SlackViewAction> & AllMiddlewareArgs<StringIndexed>) {
    await ctx.ack({
        response_action: "clear"
    });

    const view = ctx.view;

    const button = (view.blocks.find(block => block.block_id == "anchor_status") as SectionBlock).accessory as Button;
    const richText = view.state.values['rich_text']!['rich_text']?.rich_text_value!

    const config = await sql<AnchorChannelConfig[]>`INSERT INTO config (channel_id, enabled, rich_text, user_impersonate) VALUES (
        ${view.private_metadata},
        ${(button.value === "true")},        
        ${sql.json(JSON.parse(JSON.stringify(richText)))},
        ${view.state.values['user_impersonate']!['user_impersonate']!.selected_user!}
    )

    ON CONFLICT (channel_id) DO UPDATE SET 
        enabled = EXCLUDED.enabled,
        rich_text = EXCLUDED.rich_text,
        user_impersonate = EXCLUDED.user_impersonate
        
    RETURNING *`;

    if (config[0]) ctx.client.chat.postEphemeral({
        channel: view.private_metadata,
        user: ctx.body.user.id,
        text: `:white_check_mark: The Anchor configuration for <#${view.private_metadata}> has been updated!`
    })
}