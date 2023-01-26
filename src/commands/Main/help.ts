import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import {
  CommandInteractionOption,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageEmbedOptions,
  MessageSelectMenu,
  Permissions,
  PermissionString,
} from "discord.js";

export default class Help extends Command {
  constructor() {
    super("help", {
      description: (language: Language) =>
        language.get("HELP_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      aliases: ["helpme", "commands", "h"],
      args: [
        {
          id: "command",
          type: "command",
          autocomplete: true,
          description: (language: Language) =>
            language.get("HELP_COMMAND_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.value)
      return this.client.commandHandler.modules
        .filter((cmd) => this.client.util.usableCommandFilter(cmd, interaction))
        .map((cmd) => ({ name: cmd.id.replace("-", " "), value: cmd.id }))
        .filter((cmd) => cmd.name.includes(focused.value.toString()));
    return this.client.commandHandler.modules
      .filter((cmd) => this.client.util.usableCommandFilter(cmd, interaction))
      .map((cmd) => ({ name: cmd.id.replace("-", " "), value: cmd.id }));
  }

  async exec(message: FireMessage, args: { command: Command }) {
    if (typeof args.command == "undefined") return await this.sendHelp(message);
    else if (!args.command || !(args.command instanceof Command))
      return await message.error("HELP_NO_COMMAND");
    else return await this.sendUsage(message, args.command);
  }

  async sendHelp(message: FireMessage) {
    const categories = this.client.commandHandler
      .getCategories()
      .filter((category) => {
        if (category.id == "Admin" && !message.author.isSuperuser())
          return false;
        const commands = category.filter((command: Command) =>
          this.client.util.usableCommandFilter(command, message)
        );
        return commands.size > 0;
      });
    let components: MessageActionRow[] = null;
    let supportInvite = "https://inv.wtf/fire";
    const vanityurls = this.client.getModule("vanityurls") as VanityURLs;
    if (vanityurls) {
      const supportVanity = await vanityurls.getVanity("fire");
      if (typeof supportVanity == "object" && supportVanity?.invite)
        supportInvite = `https://discord.gg/${supportVanity.invite}`;
    }
    components = [
      new MessageActionRow().addComponents([
        new MessageSelectMenu()
          .setPlaceholder(message.language.get("HELP_SELECT_CATEGORY"))
          .setCustomId(`help_category`)
          .setMaxValues(1)
          .setMinValues(1)
          .addOptions(
            categories.map((category) => ({
              label: category.id,
              value: category.id,
            }))
          ),
      ]),
      new MessageActionRow().addComponents([
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://getfire.bot/")
          .setLabel(message.language.get("HELP_BUTTON_WEBSITE")),
        new MessageButton()
          .setStyle("LINK")
          .setURL(supportInvite)
          .setLabel(message.language.get("HELP_BUTTON_SUPPORT")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/terms")
          .setLabel(message.language.get("HELP_BUTTON_TOS")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/privacy")
          .setLabel(message.language.get("HELP_BUTTON_PRIVACY")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/premium")
          .setLabel(message.language.get("HELP_BUTTON_PREMIUM")),
      ]),
    ];
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .addField(
        message.language.get("HELP_SOFTWARE_CREDITS_NAME"),
        message.language.get("HELP_SOFTWARE_CREDITS_VALUE", {
          links:
            "[Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/)",
        }) +
          "\n[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)\n[Aether](https://ravy.dev/aero/aether)\n"
      )
      .addField(
        message.language.get("HELP_EMOJI_CREDITS_NAME"),
        message.language.get("HELP_EMOJI_CREDITS_VALUE", {
          links:
            "[Blob Hub Studios](https://inv.wtf/blobhub) & [Icons](https://inv.wtf/icons)",
        })
      )
      .setFooter(
        message.language.get("HELP_FOOTER", {
          shard: message.guild?.shardId ?? 0,
          cluster: this.client.manager.id,
        })
      )
      .setTimestamp();
    const upsellEmbed = await this.client.util.getSlashUpsellEmbed(message);
    return await message.channel.send({
      components,
      embeds: upsellEmbed ? [embed, upsellEmbed] : [embed],
    });
  }

  async sendUsage(message: FireMessage, command: Command) {
    let permissions: string[] = [];
    for (const perm of (command.userPermissions || []) as Array<
      PermissionString | bigint
    >)
      permissions.push(this.client.util.cleanPermissionName(perm));
    let args: string[] = command.getArgumentsClean();
    const embed = {
      color: message.member?.displayColor,
      title: titleCase(command.id),
      description: command.description(message.language),
      fields: [
        {
          name: "» Usage",
          value: `${message.util.parsed.prefix || "$"}${command.id} ${
            args?.join(" ").replace(/\] \[/gim, " ") || ""
          }`,
          inline: false,
        },
      ],
      timestamp: new Date(),
    } as MessageEmbedOptions;
    if (permissions.length)
      embed.fields.push({
        name: "» Permission" + (permissions.length > 1 ? "s" : ""),
        value: permissions.join(", "),
        inline: false,
      });
    await message.channel.send({ embeds: [embed] });
  }
}
