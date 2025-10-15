import type { ModalView, } from "@slack/web-api";
import type { AnchorChannelConfig } from "../types";

export default function buildConfigView(config: AnchorChannelConfig): ModalView {
    return {
        "type": "modal",
        "callback_id": "config-view-submit",
        "private_metadata": config.channel_id,
        "title": {
            "type": "plain_text",
            "text": "Anchor Configuration",
            "emoji": true
        },
        "submit": {
            "type": "plain_text",
            "text": "Edit",
            "emoji": true
        },
        "close": {
            "type": "plain_text",
            "text": "Cancel",
            "emoji": true
        },
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `_You are editing the Anchor configuration for <#${config.channel_id}>._`
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "block_id": "anchor_status",
                "text": {
                    "type": "mrkdwn",
                    "text": config.enabled ? ":neodog_happy: Anchor is enabled for this channel!" : ":neodog_sad: Anchor is disabled for this channel."
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": `${config.enabled ? "Disable": "Enable"} Anchor`,
                        "emoji": true
                    },
                    "style": config.enabled ? 'danger': 'primary',
                    "value": config.enabled.toString(),
                    "action_id": "toggle-anchor-status"
                }
            },
            {
                "type": "input",
                "block_id": "rich_text",
                "element": {
                    "type": "rich_text_input",
                    "action_id": "rich_text",
                    "initial_value": config.rich_text
                },
                "label": {
                    "type": "plain_text",
                    "text": "Anchored message content",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "block_id": "user_impersonate",
                "element": {
                    "type": "users_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select user",
                        "emoji": true
                    },
                    "action_id": "user_impersonate",
                    "initial_user": config.user_impersonate
                },
                "label": {
                    "type": "plain_text",
                    "text": "Anchored message author",
                    "emoji": true
                }
            }
        ]
    }
}