import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Module } from "@fire/lib/util/module";
import {
  CategoryChannel,
  Channel,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  MessageSelectMenu,
  Modal,
  ModalActionRowComponent,
  Snowflake,
  TextInputComponent,
} from "discord.js";
import { TextInputStyles } from "discord.js/typings/enums";

const supportCrashMessage = `This option is only for if the game actually crashes!
If it freezes/stops responding, that is not considered a crash and would be more suited to the "I found a bug" or "My issue is not listed" options.

When the ticket is opened, I'll ask you some questions and then provide instructions on how to find your log.
You'll need to send this log for us to look into the issue!

Hit the green button below to continue or the red one to cancel.`;

const supportBugMessage = `Bugs can be nasty and require a good amount of information to squash. Below is a list of everything you should have ready to provide but don't worry if you can't get them all...

- Versions (Minecraft version, Operating System version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

When you're ready, hit the green button below to continue or the red one to cancel.`;

const supportQuestionMessage = `We (probably) have the answer to your question but we'll need as much detail as you can give.

Firstly, you should check our [support page](<https://essential.gg/support>) to see if your question is answered there!

If our support page didn't answer your question, hit the green button below to continue or the red one to cancel.`;

const supportICEMessage = `Essential's Invite Friends feature is cool but it can't work in all situations.

If you're hosting the world, you'll need a decent PC and plenty of free RAM/CPU available for it to use. Checking these values while hosting and letting us know may help us help you.

Both players will also need a decent internet connection. If your connection isn't too stable, you may experience some issues such as falling into the void and timing out.
Lowering your render distance can sometimes help if you're timing out so give that a try!

If you're trying to play with a big modpack, it's important to note that some mods weren't designed to be used with Open to LAN (and therefore inviting friends with Esssential) so you may encounter isssues.

When you're ready, hit the green button below to continue or the red one to cancel.`;

const supportCapeMessage = `If you haven't already, make sure you've claimed the cape in <#1025539912600141824>!

Equipping the cape can be done from the \`Cape\` category in the wardrobe. It may take a little bit for the cape to appear after claiming during times of high demand so be patient if it doesn't appear instantly

If you can see the cape in the wardrobe but not while playing the game, you likely toggled cosmetic visibility.
This can be done with the \`Hide my cosmetics\` button on the main/pause menu or with the keybind (default is \`O\`)`;

const supportNetworkMessage = `Connection to Essential's network is required for most features to function!

The most common reason for not being able to connect is using or having previously used a cracked/pirated version of Minecraft or account "generator" software.

Please select the most appropriate option below to continue.`;

const supportNetworkPurchasedMessage = `There are a few other reasons that may prevent you from connecting...

- Internet issues, such as a bad connection or a firewall blocking essential.gg
- An outage on our end (Check <#885509698575560724> to see if there's any known issues)
- A malicious application has tampered with your system preventing you from authenticating with Mojang

Our support team will guide you through troubleshooting the issue in your ticket.

Click the green button below to open a ticket or the red one to cancel.`;

const supportOtherMessage = `No worries! We can't list every possible issue.

Make sure you have all the details about the issue ready to provide to the support team.
While we're usually quick to respond, issues outside of the ones listed may take a bit more time to get an answer...

If you wish to continue and open a ticket, click the green button below and you will be asked to give a short description of the issue.
You can also click the red button to cancel.`;

const openButton = () =>
  new MessageButton()
    .setStyle("SUCCESS")
    .setLabel("Open a ticket")
    .setEmoji("🎟️");

const cancelButton = new MessageButton()
  .setLabel("Cancel")
  .setStyle("DANGER")
  .setCustomId("cancel_me");

const launchersDropdown = new MessageSelectMenu()
  .setCustomId("essential_ticket_log_launcher")
  .setPlaceholder("Select your launcher (what you use to launch the game)")
  .setMinValues(1)
  .setMaxValues(1)
  .addOptions([
    {
      label: "Official Launcher",
      value: "official",
      default: false,
      emoji: "989151286287040512",
    },
    {
      label: "Curseforge",
      value: "curseforge",
      default: false,
      emoji: "1002100323562819594",
    },
    {
      label: "MultiMC/Prism",
      value: "multimc",
      default: false,
      emoji: "1002101259161051146",
    },
    {
      label: "Feather",
      value: "feather",
      default: false,
      emoji: "1048569592240410724",
    },
    {
      label: "PolyMC",
      value: "polymc",
      default: false,
      emoji: "1035582585063088198",
    },
  ]);

export default class Essential extends Module {
  otherGuildIds: Snowflake[] = ["874755593506803733"];
  publicGuildId: Snowflake = "864592657572560958";
  otherGuilds: FireGuild[] = [];
  publicGuild: FireGuild;

  categoryIds: Snowflake[] = ["930070260269318174", "907255343808139265"];
  categories: Record<Snowflake, CategoryChannel> = {};

  constructor() {
    super("essential");
  }

  async init() {
    if (this.client.config.dev) return this.remove();
    if (this.client.readyAt) await this.ready();
    else this.client.once("ready", () => this.ready());
  }

  async ready() {
    this.publicGuild = this.client.guilds.cache.get(
      this.publicGuildId
    ) as FireGuild;
    this.otherGuilds = this.otherGuildIds
      .map((id) => this.client.guilds.cache.get(id))
      .filter((guild) => !!guild) as FireGuild[];
    if (!this.publicGuild && !this.otherGuilds.length) {
      this.remove();
      return;
    }
    for (const id of this.categoryIds) {
      const channel = this.client.channels.cache.get(id);
      if (!channel) {
        this.categoryIds = this.categoryIds.filter((c) => c != id);
        continue;
      } else if (channel.type == "GUILD_CATEGORY")
        this.categories[channel.guildId] = channel;
    }
  }

  async handleTicket(trigger: ComponentMessage, type: string) {
    const member = trigger.member
      ? trigger.member
      : ((await trigger.guild?.members.fetch(trigger.author)) as FireMember);
    if (!member) return "no member"; // how
    if (!type) return "no type";
    if (type == "general") {
      const modalPromise = this.waitForModal(trigger);
      await (trigger.interaction as MessageComponentInteraction).showModal(
        new Modal()
          .setTitle("Essential Tickets")
          .setCustomId(`essential_confirm_${trigger.author.id}`)
          .addComponents(
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("reason")
                .setRequired(true)
                .setLabel("Description")
                .setPlaceholder(
                  "Enter a short description of the issue(s) you're facing"
                )
                .setStyle(TextInputStyles.SHORT)
                .setMaxLength(150)
            )
          )
      );

      const modal = await modalPromise;
      await modal.channel.ack();
      modal.flags = 64;

      const reason = modal.interaction.fields.getTextInputValue("reason");
      if (!reason?.length)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "new" });

      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        reason,
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "crash") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        "My game is crashing <:crashwoah:895747752443666442>",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel) await this.sendInitialLogDropdown(ticket);
      return ticket;
    } else if (type == "bug") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        "I found a bug that needs to be squashed 🐛",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel)
        await ticket
          .send(
            `Here's a reminder of the information you'll need to send

- Versions (Minecraft version, Operating System version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

You can run \`/latestlog\` for instructions on how to find your log.`
          )
          .catch(() => {});
      return ticket;
    } else if (type == "enquiry") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have a question ❓",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "ice") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I need help or have encountered issues while inviting friends to a world 🧊",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "network") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I'm having issues connecting to the Essential network <:status_dnd:775514595951378452>",
        trigger.realChannel as FireTextChannel,
        category
      );
    }
  }

  private waitForModal(button: ComponentMessage): Promise<ModalMessage> {
    return new Promise((resolve) => {
      this.client.modalHandlersOnce.set(
        `essential_confirm_${button.author.id}`,
        resolve
      );
    });
  }

  async sendInitialLogDropdown(
    ticket: Channel,
    slashCommand?: ApplicationCommandMessage
  ) {
    if (!ticket.isThread() && !ticket.isText()) return;
    if (!this.client.dropdownHandlers.has("essential_ticket_log_launcher"))
      this.client.dropdownHandlers.set(
        "essential_ticket_log_launcher",
        this.handleLauncherDropdown.bind(this)
      );
    await (
      slashCommand?.channel.send.bind(slashCommand.channel) ??
      ticket.send.bind(ticket)
    )({
      content:
        "Please select what launcher you use from the dropdown below to get instructions on how to find the log",
      components: [new MessageActionRow().addComponents(launchersDropdown)],
    });
  }

  private async handleLauncherDropdown(dropdown: ComponentMessage) {
    if (!this.publicGuild.tags) {
      this.publicGuild.tags = new GuildTagManager(
        this.client,
        this.publicGuild
      );
      await this.publicGuild.tags.init();
    }
    const launcher = dropdown.values[0] as
      | "official"
      | "curseforge"
      | "multimc"
      | "feather"
      | "polymc";
    if (launcher == "official") {
      const manager = this.publicGuild.tags;
      const cachedTag = await manager.getTag("vanillalog");
      if (!cachedTag) return await dropdown.error("COMMAND_ERROR_GENERIC");
      await manager.useTag(cachedTag.name);
      return await dropdown
        .edit({ content: cachedTag.content, components: [] })
        .catch(() => {});
    } else if (launcher == "curseforge") {
      const manager = this.publicGuild.tags;
      const cachedTag = await manager.getTag("curseforgelog");
      if (!cachedTag) return await dropdown.error("COMMAND_ERROR_GENERIC");
      await manager.useTag(cachedTag.name);
      return await dropdown
        .edit({ content: cachedTag.content, components: [] })
        .catch(() => {});
    } else if (launcher == "multimc") {
      const manager = this.publicGuild.tags;
      const cachedTag = await manager.getTag("multimclog");
      if (!cachedTag) return await dropdown.error("COMMAND_ERROR_GENERIC");
      await manager.useTag(cachedTag.name);
      return await dropdown
        .edit({ content: cachedTag.content, components: [] })
        .catch(() => {});
    } else if (launcher == "polymc") {
      return await dropdown.edit({
        content:
          "We advise against using PolyMC due to a recent incident! See https://discord.com/channels/864592657572560958/880139889818099722/1031651874102849627",
        components: [],
      });
    } else if (launcher == "feather") {
      const manager = this.publicGuild.tags;
      const cachedTag = await manager.getTag("featherlog");
      if (!cachedTag) return await dropdown.error("COMMAND_ERROR_GENERIC");
      await manager.useTag(cachedTag.name);
      return await dropdown
        .edit({ content: cachedTag.content, components: [] })
        .catch(() => {});
    }
  }

  async supportHandleCrash(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_crash"),
      cancelButton,
    ];
    return await button.edit({
      content: supportCrashMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleBug(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_bug"),
      cancelButton,
    ];
    return await button.edit({
      content: supportBugMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleEnquiry(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_enquiry"),
      cancelButton,
    ];
    return await button.edit({
      content: supportQuestionMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleIce(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_ice"),
      cancelButton,
    ];
    return await button.edit({
      content: supportICEMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleCape(button: ComponentMessage) {
    return await button.edit({
      content: supportCapeMessage,
      components: [],
    });
  }

  async supportHandleNetwork(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("I have purchased the game")
        .setEmoji("💵")
        .setCustomId("essentialsupport:network_purchased"),
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("I am using a cracked/pirated version")
        .setEmoji("🏴‍☠️")
        .setCustomId("essentialsupport:cracked"),
      cancelButton,
    ];
    return await button.edit({
      content: supportNetworkMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleNetworkPurchased(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_network"),
      cancelButton,
    ];
    return await button.edit({
      content: supportNetworkPurchasedMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleCracked(button: ComponentMessage) {
    if (!button.guild.tags) {
      button.guild.tags = new GuildTagManager(this.client, button.guild);
      await button.guild.tags.init();
    }
    const manager = button.guild.tags;
    const cachedTag = await manager.getTag("cracked");
    return await button.edit({
      content: cachedTag.content,
      components: [new MessageActionRow().setComponents([cancelButton])],
    });
  }

  async supportHandleOther(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("!essential_confirm_general"),
      cancelButton,
    ];
    return await button.edit({
      content: supportOtherMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }
}
