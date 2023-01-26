import { CommandInt } from "../interfaces/CommandInt";
import { edit } from "../commands/index.commands";
import { help } from "../commands/index.commands";
import { oneHundred } from "../commands/index.commands";
import { reset } from "../commands/index.commands";
import { view } from "../commands/index.commands";

import { Commands } from "../commands/index.commands";

export const CommandList: CommandInt[] = [oneHundred, view, help, edit, reset];

export const commands: CommandInt[] = [oneHundred, view, help, edit, reset];