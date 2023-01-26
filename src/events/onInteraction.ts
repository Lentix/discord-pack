import { Interaction } from "discord.js";
import { Commands } from "../commands/index.commands";
import { errorHandler } from "../utils/errorHandler";

export const onInteraction = async (
  interaction: Interaction
): Promise<void> => {
  try {
    if (interaction.isCommand()) {
      for (const Command of Commands) {
        if (interaction.commandName === Commands.data.name) {
          await Commands.run(interaction);
          break;
        }
      }
    }
  } catch (err) {
    errorHandler("onInteraction event", err);
  }
};
