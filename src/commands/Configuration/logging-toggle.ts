import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { GuildLogManager } from "@fire/lib/util/logmanager";
import { Permissions } from "discord.js";

type validTypes = "moderation" | "action" | "members";
const valid = ["moderation", "action", "members"];
const langKeys = {
  types: "moderation, action, members",
};

export default class LoggingToggle extends Command {
  constructor() {
    super("logging-toggle", {
      description: (language: Language) =>
        language.get("LOGGING_TOGGLE_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "type",
          type: "string",
          autocomplete: true,
          required: true,
          default: null,
        },
        {
          id: "channel",
          type: "textChannelSilent",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      parent: "logging",
      slashOnly: true,
    });
  }

  async autocomplete() {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return valid;
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      type: validTypes;
      channel: FireTextChannel;
    }
  ) {
    const type = args.type?.toLowerCase() as validTypes;
    if (!args.type || !valid.includes(args.type))
      return await command.error("LOGGING_INVALID_TYPE", langKeys);
    const otherTypes = valid.filter((t) => t != type);
    const otherChannels = otherTypes.map((t) =>
      command.guild.settings.get<string>(`log.${t}`)
    );
    if (
      args.channel &&
      otherChannels.includes(args.channel.id) &&
      command.guild.memberCount >= 1000
    )
      return await command.error("LOGGING_SIZE_SAME_CHANNEL");
    if (!args.channel) {
      let deleted: any;
      try {
        deleted = await command.guild.settings.delete(`log.${type}`);
        if (!command.guild.logger)
          command.guild.logger = new GuildLogManager(
            this.client,
            command.guild
          );
        await command.guild.logger.refreshWebhooks().catch(() => {});
      } catch {}
      return deleted
        ? await command.success(
            `LOGGING_DISABLED_${type.toUpperCase()}` as LanguageKeys
          )
        : await command.error("ERROR_CONTACT_SUPPORT");
    } else {
      let set: any;
      try {
        set = await command.guild.settings.set<string>(
          `log.${type}`,
          args.channel.id
        );
        if (set) {
          if (!command.guild.logger)
            command.guild.logger = new GuildLogManager(
              this.client,
              command.guild
            );
          await command.guild.logger.refreshWebhooks().catch(() => {});
        }
      } catch {}
      return set
        ? await command.success(
            `LOGGING_ENABLED_${type.toUpperCase()}` as LanguageKeys
          )
        : await command.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
