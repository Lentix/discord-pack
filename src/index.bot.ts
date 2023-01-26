// File: project/repo/packages/src/index.ts

// Using ES6 imports
import * as Sentry from "@sentry/node";

import { RewriteFrames } from "@sentry/integrations";

import { Client, GatewayIntentBits, Collection, PermissionFlagsBits, } from "discord.js";

import { validateEnv } from "./utils/validateEnv";
import { connectDatabase } from "./database/ConnectDatabase";
import { onReady } from "./events/onReady";
import { onInteraction } from "./events/onInteraction";
import { IntentOptions } from "./config/IntentOptions";
//
import { Command, SlashCommand } from "./types";

import { config } from "dotenv";
import { readdirSync } from "fs";
import { join } from "path";
import { defaultMaxListeners } from "events";
import { Commands } from './commands/index.commands';

export { logHandler } from "./utils/logHandler";
export { errorHandler } from "./utils/errorHandler";
export * from "./utils";

// export * as Commands from "./commands/index.commands";
// export * as Components from "./components";
// export * as Database from "./database/mongoose";

const { Guilds, MessageContent, GuildMessages, GuildMembers } = GatewayIntentBits;

const BOT = new Client(
  {intents:
      [IntentOptions, Guilds, MessageContent, GuildMessages, GuildMembers]
  });

BOT.on(
  "ready",
  async () => await onReady(BOT));
{ validateEnv();
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      integrations: [
        new RewriteFrames({
          root: global.__dirname,
        }),
      ],
    });

    BOT.on(
      "interactionCreate",
      async (interaction) => await onInteraction(interaction)
    );

// client.slashCommands = new Collection<string, SlashCommand>()
// client.commands = new Collection<string, Command>()
// client.cooldowns = new Collection<string, number>()

const handlersDir = join(__dirname, "./handlers")
readdirSync(handlersDir).forEach(handler => {
    require(`${handlersDir}/${handler}`)(Client)
});

  await connectDatabase();

  await BOT.login(process.env.TOKEN as string)};
