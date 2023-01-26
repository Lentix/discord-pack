import * as Command from "../commands/index.commands";

import { Ping } from "../commands/server/ping";
import { Hello } from "../commands/greetings/hello";
import { CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

// Exports
export const Commands: CommandInteraction [] = [Ping, Hello];

// export { Args } from './args.commands';
// export { Command, CommandDeferType } from '../commands/index.commands';
// export { ChatCommandMetadata, MessageCommandMetadata, UserCommandMetadata } from './metadata.commands.js';
