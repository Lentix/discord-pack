import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class SilentInhibitor extends Inhibitor {
  constructor() {
    super("silent", {
      reason: "silent",
      type: "post",
      priority: 2,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    if (command?.id != "quote" && message.silent && message.guild)
      await message.delete().catch(() => {});
    return false;
  }
}
