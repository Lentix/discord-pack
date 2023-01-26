import { Fire } from "@fire/lib/Fire";
import { UserSettings } from "@fire/lib/util/settings";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import {
  DMChannel,
  MessageEmbed,
  Structures,
  User,
  UserMention,
  Util,
} from "discord.js";
import { RawUserData } from "discord.js/typings/rawDataTypes";
import { murmur3 } from "murmurhash-js";
import { GuildTextChannel, ModLogTypes } from "../util/constants";
import { FakeChannel } from "./appcommandmessage";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";

type Primitive = string | boolean | number | null;

export class FireUser extends User {
  settings: UserSettings;
  declare client: Fire;

  constructor(client: Fire, data: RawUserData) {
    super(client, data);
    this.settings = new UserSettings(this.client, this);
  }

  get language() {
    return (
      this.client.getLanguage(
        this.settings.get<string>("utils.language", "en-US")
      ) ?? this.client.getLanguage("en-US")
    );
  }

  get premium() {
    return [...this.client.util.premium.values()].filter(
      (data) => data.user == this.id
    ).length;
  }

  toString() {
    return `${this.username}#${this.discriminator}` as unknown as UserMention;
  }

  toMention() {
    return super.toString();
  }

  async createDM() {
    if (this.bot)
      return new DMChannel(this.client, {
        id: "991835355533811793",
        type: 1,
      });
    else return super.createDM();
  }

  async blacklist(reason: string) {
    return await this.client.util.blacklist(this, reason);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: number, bucket: number | number[]): boolean {
    return this.client.util.userHasExperiment(this.id, id, bucket);
  }

  async giveExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    if (!experiment.buckets.includes(bucket)) throw new Error("Invalid Bucket");
    experiment.data = experiment.data.filter(([i]) => i != this.id);
    experiment.data.push([this.id, bucket]);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return this.hasExperiment(id, bucket);
  }

  async removeExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    const b = experiment.data.length;
    experiment.data = experiment.data.filter(
      ([i, b]) => i != this.id && b != bucket
    );
    if (b == experiment.data.length) return !this.hasExperiment(id, bucket);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return !this.hasExperiment(id, bucket);
  }

  get hoisted() {
    return this.username[0] < "0";
  }

  get cancerous() {
    return !this.client.util.isASCII(this.username);
  }

  isSuperuser() {
    return this.client.util.isSuperuser(this.id);
  }

  async createReminder(when: Date, why: string, link: string) {
    if (!this.client.manager.ws?.open)
      return process.env.NODE_ENV == "development";
    const timestamp = +when;
    if (
      isNaN(timestamp) ||
      (timestamp < +new Date() + 60000 && !this.isSuperuser())
    )
      return false;
    const reminder = await this.client.db
      .query(
        "INSERT INTO remind (uid, forwhen, reminder, link) VALUES ($1, $2, $3, $4);",
        [this.id, when, why, link]
      )
      .catch(() => {});
    if (!reminder) return false;
    this.client.manager?.ws.send(
      MessageUtil.encode(
        new Message(EventType.REMINDER_CREATE, {
          user: this.id,
          text: why,
          link,
          timestamp,
        })
      )
    );
    return true;
  }

  async deleteReminder(timestamp: number) {
    this.client.console.warn(
      `[Reminders] Deleting reminder for user ${this} with timestamp ${timestamp}`
    );
    const deleted = await this.client.db
      .query("DELETE FROM remind WHERE uid=$1 AND forwhen=$2;", [
        this.id,
        new Date(timestamp),
      ])
      .catch(() => false);
    if (typeof deleted == "boolean" && !deleted) return false;
    this.client.manager?.ws.send(
      MessageUtil.encode(
        new Message(EventType.REMINDER_DELETE, {
          user: this.id,
          timestamp,
        })
      )
    );
    return true;
  }

  async bean(
    guild: FireGuild,
    reason: string,
    moderator: FireMember,
    days: number = 0,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!guild || !reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const already = await guild.bans.fetch(this).catch(() => {});
    if (already) return "already";
    const logEntry = await guild
      .createModLogEntry(this, moderator, ModLogTypes.BAN, reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const banned = await guild.members
      .ban(this, {
        reason: `${moderator} | ${reason}`,
        deleteMessageSeconds: 86400 * days,
      })
      .catch(() => {});
    if (!banned) {
      const deleted = await guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "ban" : "ban_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: guild.language.get("BAN_LOG_AUTHOR", { user: this.toString() }),
        iconURL: this.avatarURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addField(guild.language.get("MODERATOR"), moderator.toString())
      .addField(guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await guild.modLog(embed, ModLogTypes.BAN).catch(() => {});
    if (channel)
      return await channel
        .send({
          content:
            guild.language.getSuccess("BAN_SUCCESS", {
              user: Util.escapeMarkdown(this.toString()),
              guild: Util.escapeMarkdown(guild.name),
            }) +
            (this.id == "159985870458322944"
              ? "\nhttps://tenor.com/view/star-wars-death-star-explosion-explode-gif-17964336"
              : ""),
        })
        .catch(() => {});
  }
}

Structures.extend("User", () => FireUser);
// hack of the century
const clientUserCacheKey = Object.keys(require.cache).find((key) =>
  key.includes("ClientUser")
);
delete require.cache[clientUserCacheKey];
