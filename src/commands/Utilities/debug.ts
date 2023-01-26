import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import {
  BitFieldResolvable,
  CommandInteractionOption,
  DMChannel,
  GuildChannel,
  MessageEmbed,
  Permissions,
  PermissionString,
} from "discord.js";
import { StringMap, TOptions } from "i18next";

const {
  emojis: { success, error },
} = constants;

export default class Debug extends Command {
  constructor() {
    super("debug", {
      description: (language: Language) =>
        language.get("DEBUG_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "command",
          type: "command",
          autocomplete: true,
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.value)
      return this.client.commandHandler.modules
        .filter((cmd) => cmd.id.includes(focused.value?.toString()))
        .map((cmd) => ({ name: cmd.id.replace("-", " "), value: cmd.id }));
    return this.client.commandHandler.modules.map((cmd) => ({
      name: cmd.id.replace("-", " "),
      value: cmd.id,
    }));
  }

  async run(command: ApplicationCommandMessage, args: { command: Command }) {
    const cmd = args.command;
    const channel = command.realChannel;

    if (!cmd) return await this.sendSingleError(command, "DEBUG_NO_COMMAND");
    if (!cmd.id) return await this.sendSingleError(command, "UNKNOWN_COMMAND");
    if (cmd.id == this.id)
      return await this.sendSingleSuccess(command, "DEBUGGING_DEBUG");
    if (this.client.util.isBlacklisted(command.author.id, command.guild))
      return await this.sendSingleError(command, "DEBUG_BLACKLISTED");
    if (+new Date() - command.author.createdTimestamp < 86400000)
      return await this.sendSingleError(command, "COMMAND_ACCOUNT_TOO_YOUNG");
    if (cmd.ownerOnly && !this.client.isOwner(command.author))
      return await this.sendSingleError(command, "COMMAND_OWNER_ONLY");
    if (cmd.superuserOnly && !command.author.isSuperuser())
      return await this.sendSingleError(command, "COMMAND_SUPERUSER_ONLY");
    if (cmd.moderatorOnly && !command.member?.isModerator())
      return await this.sendSingleError(command, "COMMAND_MODERATOR_ONLY");
    if (cmd.channel == "guild" && !command.guild)
      return await this.sendSingleError(command, "COMMAND_GUILD_ONLY", {
        invite: this.client.config.inviteLink,
      });
    if (cmd.guilds.length && !cmd.guilds.includes(command.guild?.id))
      return await this.sendSingleError(command, "COMMAND_GUILD_LOCKED");
    if (cmd.premium && !command.guild?.premium)
      return await this.sendSingleError(command, "COMMAND_PREMIUM_GUILD_ONLY");

    const requiresExperiment = cmd.requiresExperiment;
    if (requiresExperiment) {
      const experiment = this.client.experiments.get(requiresExperiment.id);
      if (!experiment)
        return await this.sendSingleError(
          command,
          "COMMAND_EXPERIMENT_REQUIRED"
        );
      else if (
        !command.hasExperiment(experiment.hash, requiresExperiment.bucket)
      )
        return await this.sendSingleError(
          command,
          "COMMAND_EXPERIMENT_REQUIRED"
        );
    }

    const details: string[] = [];

    const clientMissing =
      channel instanceof DMChannel
        ? (cmd.clientPermissions as PermissionString[])
        : channel
            .permissionsFor(this.client.user)
            .missing(
              cmd.clientPermissions as BitFieldResolvable<
                PermissionString,
                bigint
              >
            );
    const userMissing =
      channel instanceof DMChannel
        ? (cmd.userPermissions as PermissionString[])
        : channel
            .permissionsFor(command.member)
            .missing(
              cmd.userPermissions as BitFieldResolvable<
                PermissionString,
                bigint
              >
            );

    const permissionChecks = clientMissing?.length || userMissing?.length;

    if (permissionChecks && command.guild) {
      const user = userMissing
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, command.language)
        )
        .filter((permission) => !!permission);

      const client = clientMissing
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, command.language)
        )
        .filter((permission) => !!permission);

      let permMsgUser: string, permMsgClient: string;
      if (user.length)
        permMsgUser = command.language.get("DEBUG_PERMS_FAIL_USER", {
          missing: user.join(", "),
        });
      if (client.length)
        permMsgUser = command.language.get("DEBUG_PERMS_FAIL_CLIENT", {
          missing: user.join(", "),
        });

      if (permMsgUser || permMsgClient)
        details.push(
          `${error} ${command.language.get("DEBUG_PERMS_CHECKS_FAIL")}` +
            (permMsgUser ? `\n${permMsgUser}` : "") +
            (permMsgClient ? `\n${permMsgClient}` : "")
        );
    } else if (permissionChecks)
      details.push(`${error} ${command.language.get("DEBUG_REQUIRES_PERMS")}`);
    else details.push(`${success} ${command.language.get("DEBUG_PERMS_PASS")}`);

    const disabledCommands =
      command.guild?.settings.get<string[]>("disabled.commands", []) ?? [];

    if (disabledCommands.includes(cmd.id)) {
      if (command.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        details.push(
          `${success} ${command.language.get("DEBUG_COMMAND_DISABLE_BYPASS")}`
        );
      else
        details.push(
          `${error} ${command.language.get("DEBUG_COMMAND_DISABLED")}`
        );
    } else if (command.guild)
      details.push(
        `${success} ${command.language.get("DEBUG_COMMAND_NOT_DISABLED")}`
      );

    if (cmd.id == "mute" && command.guild && channel instanceof GuildChannel) {
      const canSend = channel.permissionOverwrites.cache
        .filter((overwrite) =>
          overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
        )
        .map((overwrite) => overwrite.id);
      const roles = [
        ...canSend
          .map((id) => command.guild.roles.cache.get(id))
          .filter((role) => !!role),
        ...command.guild.roles.cache
          .filter(
            (role) =>
              role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
              !canSend.find((id) => id == role.id)
          )
          .values(),
      ];
      const memberIds = canSend.filter(
        (id) => !roles.find((role) => role.id == id)
      );
      // owner can always bypass
      memberIds.push(command.guild.ownerId);
      const members: string[] = memberIds.length
        ? await command.guild.members
            .fetch({ user: memberIds })
            .then((found) =>
              found.map((member: FireMember) => member.toMention())
            )
            .catch(() => [])
        : [];

      const bypass = [...roles, ...members];

      if (bypass.length > 0)
        details.push(
          `${error} ${command.language.get("DEBUG_MUTE_BYPASS", {
            channel: channel.toString(),
            bypass: bypass.map((b) => b.toString()).join(", "),
          })}`
        );
      else
        details.push(
          `${success} ${command.language.get("DEBUG_MUTE_NO_BYPASS", {
            channel: channel.toString(),
          })}`
        );
    }

    if (
      !command.guild ||
      (command.guild &&
        command.guild.me?.permissions.has(Permissions.FLAGS.EMBED_LINKS))
    )
      return await command.channel.send({
        embeds: [this.createEmbed(command, details)],
      });
    else {
      details.push(`${error} ${command.language.get("DEBUG_NO_EMBEDS")}`);
      return await command.channel.send({ content: details.join("\n") });
    }
  }

  private createEmbed(command: ApplicationCommandMessage, details: string[]) {
    const issues = details.filter((detail) => detail.startsWith(error));
    return new MessageEmbed()
      .setTitle(
        command.language.get(
          issues.length ? "DEBUG_ISSUES_FOUND" : "DEBUG_NO_ISSUES",
          { issues: issues.length }
        )
      )
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(details.join("\n"));
  }

  private async sendSingleError(
    command: ApplicationCommandMessage,
    key: LanguageKeys,
    args?: TOptions<StringMap>
  ) {
    return await command.channel.send({
      embeds: [
        this.createEmbed(command, [
          `${error} ${command.language.get(key, args)}`,
        ]),
      ],
    });
  }

  private async sendSingleSuccess(
    command: ApplicationCommandMessage,
    key: LanguageKeys,
    args?: TOptions<StringMap>
  ) {
    return await command.channel.send({
      embeds: [
        this.createEmbed(command, [
          `${success} ${command.language.get(key, args)}`,
        ]),
      ],
    });
  }
}
