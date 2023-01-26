import { CommandInteraction, Client } from "discord.js";
import { Command } from "../commands/command";

export const Ping: Command = {
    name: "hello",
    description: "Returns a server Pong",
    type: "CHAT_INPUT",
    run: async (client: Client, interaction: CommandInteraction) => {
        const content = "Pong";

        await interaction.followUp({
            ephemeral: true,
            content
        });
    }
};