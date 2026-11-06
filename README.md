# Telegram Crypto AI Assistant

A single, clearly identified Telegram AI assistant for educational crypto Q&A.
It does **not** control personal Telegram accounts or impersonate group members.

## Railway variables

Set these in Railway > Service > Variables:

- `TELEGRAM_BOT_TOKEN` — use a newly rotated token; the token previously pasted into chat should be revoked.
- `TELEGRAM_GROUP_ID` — your target supergroup ID.
- `OPENAI_API_KEY` — your OpenAI API key. Never commit it to Git or paste it into source files.
- `OPENAI_MODEL` — model available to your API project (default in this template: `gpt-5.5`).
- `USER_COOLDOWN_SECONDS` — optional, default `20`.

## Deploy

1. Upload this project to a private GitHub repository.
2. In Railway, create a new project and deploy from that repository.
3. Add the variables above in Railway Variables.
4. Ensure only one running replica/service instance uses this bot token (Telegram polling should have one consumer).
5. Deploy and inspect Railway logs for `Telegram AI assistant is running.`

## Telegram group access

The bot must be in the group. To answer ordinary group messages, it must be able to receive them:
- Either make the bot an administrator (grant only the permissions it actually needs), or
- Disable its Group Privacy setting with BotFather.

When privacy mode is enabled and the bot is not an admin, it generally receives only commands, mentions, and replies directed to it. Make sure group members know that messages may be processed by an AI service before enabling full message access.

## Behavior

- Replies only to crypto-related text messages.
- Replies in the language used by the group member.
- Uses one of 15 educational perspectives; all replies are clearly labeled as AI.
- Per-user cooldown helps prevent message flooding.
- Conversation context is kept in memory and resets on service restart.

## Safety

This is an educational assistant, not financial advice. It does not provide personalized investment recommendations, price predictions, or requests for wallet credentials.
