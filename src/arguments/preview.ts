import { guildPreviewConverter } from "@fire/lib/util/converters";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { ArgumentTypeCaster } from "discord-akairo";
import { GuildPreview } from "discord.js";

export const previewTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<GuildPreview | FireGuild | null> =>
  guildPreviewConverter(message, phrase);

export const previewSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<GuildPreview | FireGuild | null> =>
  guildPreviewConverter(message, phrase, true);
