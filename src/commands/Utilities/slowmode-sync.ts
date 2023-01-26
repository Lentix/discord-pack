import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Permissions } from "discord.js";

export default class SlowmodeSync extends Command {
  constructor() {
    super("slowmode-sync", {
      description: (language: Language) =>
        language.get("SLOWMODE_SYNC_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_CHANNELS],
      clientPermissions: [Permissions.FLAGS.MANAGE_CHANNELS],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const current = command.guild.settings.get("slowmode.sync", false);
    await command.guild.settings.set("slowmode.sync", !current);
    if (command.guild.settings.get("slowmode.sync", current) == current)
      return await command.error("SLOWMODE_SYNC_TOGGLE_FAIL");
    return await command.success(
      !current ? "SLOWMODE_SYNC_ENABLED" : "SLOWMODE_SYNC_DISABLED"
    );
  }
}
