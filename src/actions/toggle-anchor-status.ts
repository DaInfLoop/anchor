import type { AllMiddlewareArgs, BlockButtonAction, SlackActionMiddlewareArgs, StringIndexed } from "@slack/bolt";
import buildConfigView from "../../lib/buildConfigView";
import type { AnchorChannelConfig } from "../../types";
import sql from "../../postgres";

export default async function ToggleAnchorStatus(ctx: SlackActionMiddlewareArgs<BlockButtonAction> & AllMiddlewareArgs<StringIndexed>) {
    await ctx.ack();

    const view = ctx.body.view!;

    const richText = view.state.values['rich_text']!['rich_text']?.rich_text_value!

    const config = await sql<AnchorChannelConfig[]>`INSERT INTO config (channel_id, enabled, rich_text, user_impersonate) VALUES (
        ${view.private_metadata},
        ${!(ctx.action.value === "true")},
        ${sql.json(JSON.parse(JSON.stringify(richText)))},
        ${view.state.values['user_impersonate']!['user_impersonate']!.selected_user!}
    )

    ON CONFLICT (channel_id) DO UPDATE SET 
        enabled = EXCLUDED.enabled,
        rich_text = EXCLUDED.rich_text,
        user_impersonate = EXCLUDED.user_impersonate
        
    RETURNING *`;

    if (config[0]) ctx.client.views.update({
        view_id: view.id,
        view: buildConfigView(config[0])
    })
}