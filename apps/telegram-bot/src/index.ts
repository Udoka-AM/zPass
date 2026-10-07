// zPass Telegram gate bot (task 3.6, docs/03-APP-FLOW.md §3.3).
// Sessions live only in memory (≤ 15 min). The bot persists no Telegram user IDs.
import { serve } from "@hono/node-server";
import { Bot } from "grammy";
import { Hono } from "hono";
import pino from "pino";

const log = pino({ name: "telegram-bot" });
const token = process.env.TELEGRAM_BOT_TOKEN;

// HTTP side: the prover page posts proofs here (TODO 3.6: POST /tg/sessions/:id/proof).
const http = new Hono();
http.get("/healthz", (c) => c.json({ status: "ok", bot: Boolean(token) }));
const port = Number(process.env.BOT_PORT ?? 8789);
serve({ fetch: http.fetch, port }, () => log.info({ port }, "bot http listening"));

if (!token) {
  log.warn("TELEGRAM_BOT_TOKEN not set; bot polling disabled");
} else {
  const bot = new Bot(token);
  bot.command("start", (ctx) =>
    // TODO(3.6): create an in-memory session and reply with a prover link button.
    ctx.reply("zPass gate bot. Membership proofs are coming soon."),
  );
  // TODO(3.6): /gate <group> <minAnonSet>, /ungate (chat admins only)
  bot.catch((err) => log.error({ err: err.message }, "bot error"));
  void bot.start();
  log.info("bot polling started");
}
