import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Permissions, Role } from "discord.js";
import Moderators from "./moderators";

export default class RemoveModerator extends Command {
  constructor() {
    super("moderators-remove", {
      description: (language: Language) =>
        language.get("MODERATORS_REMOVE_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "moderator",
          type: "member|role",
          readableType: "member/role",
          slashCommandType: "member-or-role",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      parent: "moderators",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { moderator: FireMember | Role }
  ) {
    let current = command.guild.settings.get<string[]>("utils.moderators", []);
    if (current.includes(args.moderator.id))
      current = current.filter((id) => id != args.moderator.id);
    else
      return await command.error("MODERATORS_REMOVE_NOT_A_MOD", {
        type:
          args.moderator instanceof FireMember
            ? command.language.get("MEMBER")
            : command.language.get("ROLE"),
      });
    if (current.length)
      command.guild.settings.set<string[]>("utils.moderators", current);
    else command.guild.settings.delete("utils.moderators");
    return await (this.parentCommand as Moderators).getModeratorEmbed(command);
  }
}
