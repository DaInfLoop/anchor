import type { RichTextBlock } from "@slack/web-api"

export type AnchorChannelConfig = {
    channel_id: string,
    enabled: boolean,
    rich_text: RichTextBlock,
    user_impersonate: string
}

export type AnchorLastAnchored = {
    channel_id: string,
    ts: string
}