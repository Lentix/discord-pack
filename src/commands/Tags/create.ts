import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

const nameRegex = /^[\w-]{1,32}$/gim;

export default class TagCreate extends Command {
  constructor() {
    super("tag-create", {
      description: (language: Language) =>
        language.get("TAG_CREATE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: true,
        },
        {
          id: "content",
          type: "string",
          required: true,
          match: "rest",
          default: null,
        },
      ],
      aliases: [
        "tag-add",
        "tag-+",
        "tags-create",
        "tags-add",
        "tags-+",
        "dtag-create",
        "dtag-add",
        "dtag-+",
        "dtags-create",
        "dtags-add",
        "dtags-+",
      ],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string; content?: string }) {
    if (!args.tag) return await message.error("TAGS_CREATE_MISSING_NAME");
    else if (!args.content)
      return await message.error("TAGS_CREATE_MISSING_CONTENT");
    const { tag, content } = args;
    if (content.length > 2000)
      return await message.error("TAGS_CREATE_CONTENT_TOO_LONG");
    if (this.client.getCommand(`tag-${tag}`))
      return await message.error("TAGS_CREATE_COMMAND_NAME");
    if (!nameRegex.test(tag)) {
      nameRegex.lastIndex = 0;
      return await message.error("TAGS_CREATE_INVALID_CHARACTERS");
    }
    nameRegex.lastIndex = 0;
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (cachedTag) return await message.error("TAGS_CREATE_ALREADY_EXISTS");
    if (manager.names.length >= 20 && !message.guild.premium)
      return await message.error("TAGS_CREATE_LIMIT");
    const newTag = await manager.createTag(tag, content, message.member);
    if (typeof newTag == "boolean" && !newTag)
      return await message.error("TAGS_CREATE_FAILED");
    else return await message.success("TAGS_CREATE_SUCCESS", { tag });
  }
}
