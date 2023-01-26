import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { Language } from "@fire/lib/util/language";

export const languageTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Language | null => message.client.getLanguage(phrase);
