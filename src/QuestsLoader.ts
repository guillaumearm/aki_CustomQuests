import type { IQuest } from "@spt-aki/models/eft/common/tables/IQuest";
import type { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import type { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import type { VFS } from "@spt-aki/utils/VFS";

import { join } from "path";
import type { Config } from "./config";
import { getLimitRepeatedQuest } from "./config";

import type { CustomQuest, StoryItem } from "./customQuests";

import {
  isStoryAcceptedItemGroup,
  isStoryCustomQuest,
  isStoryItemBuild,
} from "./customQuests";

import type { GeneratedLocales } from "./CustomQuestsTransformer";
import { QuestsGenerator } from "./QuestsGenerator";
import { createRepeatedQuestId } from "./RepeatableQuests";
import { flatten, getAllLocales, readJsonFile } from "./utils";

const repeatQuest = (
  quest: CustomQuest,
  limitRepeatedQuest: number
): CustomQuest[] => {
  let previousId = quest.id;

  const additionalQuests: CustomQuest[] = Array.from(
    Array(Math.abs(limitRepeatedQuest)).keys()
  ).map((index) => {
    const newQuest = { ...quest };
    const lockedByQuests = newQuest.locked_by_quests ?? [];

    newQuest.id = createRepeatedQuestId(newQuest.id, index);
    newQuest.locked_by_quests = [...lockedByQuests, previousId];

    previousId = newQuest.id;
    return newQuest;
  });

  return [quest, ...additionalQuests];
};

export class QuestsLoader {
  constructor(
    private questDirectory: string,
    private db: DatabaseServer,
    private vfs: VFS,
    private config: Config,
    private logger: ILogger,
    private debug: (data: string) => void
  ) {
    this.questDirectory = questDirectory;
  }

  loadAll(): IQuest[] {
    let loadedQuests = this.loadDir(this.questDirectory);

    this.vfs.getDirs(this.questDirectory).forEach((subdir) => {
      if (subdir.endsWith(".disabled")) {
        if (subdir !== "examples.disabled") {
          this.logger.warning(
            `=> Custom Quests: skipped '${subdir}' quest directory`
          );
        }
      } else {
        const loadedSubQuests = this.loadDir(join(this.questDirectory, subdir));
        loadedQuests = [...loadedQuests, ...loadedSubQuests];
      }
    });

    return loadedQuests;
  }

  private loadDir(dir: string): IQuest[] {
    let loadedQuests: IQuest[] = [];

    this.vfs.getFiles(dir).forEach((fileName) => {
      if (fileName.endsWith(".json")) {
        const quests = this.loadFile(fileName, dir);
        loadedQuests = [...loadedQuests, ...quests];
      }
    });

    return loadedQuests;
  }

  private loadQuest(quest: IQuest): void {
    const quests = this.db.getTables().templates.quests;

    if (quests[quest._id]) {
      this.logger.error(
        `=> Custom Quests: already registered questId '${quest._id}'`
      );
    } else {
      quests[quest._id] = quest;
    }
  }

  private loadLocales(
    questId: string,
    localesPayloads: GeneratedLocales
  ): void {
    const locales = this.db.getTables().locales;

    getAllLocales(this.db).forEach((localeName) => {
      const payload = localesPayloads[localeName];
      const globalLocales = locales.global[localeName];

      if (globalLocales.quest[questId]) {
        this.logger.error(
          `=> Custom Quests: already registered locales for questId '${questId}'`
        );
      } else {
        globalLocales.quest[questId] = payload.quest;
      }

      Object.keys(payload.mail).forEach((mailId) => {
        if (globalLocales.mail[mailId]) {
          this.logger.error(
            `=> Custom Quests: already registered mail '${mailId}' for questId '${questId}'`
          );
        } else {
          globalLocales.mail[mailId] = payload.mail[mailId];
        }
      });
    });
  }

  private expandRepeatableQuests(quests: CustomQuest[]): CustomQuest[] {
    const resultQuests: CustomQuest[][] = [];

    const limitRepeatedQuest = getLimitRepeatedQuest(this.config);

    quests.forEach((q) => {
      if (q.repeatable) {
        const repeatableQuests = repeatQuest(q, limitRepeatedQuest);
        resultQuests.push(repeatableQuests);
      } else {
        resultQuests.push([q]);
      }
    });

    return flatten(resultQuests);
  }

  /**
   * Replace whitespaces ' ' by '_' in ids for:
   * 1. all story items
   * 2. all rewards
   * 3. all start_rewards
   * 4. all locked_by_quests
   * 5. all unlock_on_quest_start
   * 6. all accepted_items
   *
   */
  private transformIds<T extends StoryItem>(item: T): T {
    const { id } = item;

    // 1
    const newId = id.replace(/ /g, "_");

    if (newId !== id) {
      this.logger.warning(`=> Custom Quests: id ${id} replaced by '${newId}'`);
    }

    // TODO: 2
    // TODO: 3
    // TODO: 4
    // TODO: 5
    // TODO: 6

    return {
      ...item,
      id: newId,
    };
  }

  public injectStory(
    story: StoryItem[],
    fileName = "@api-quest-loader"
  ): IQuest[] {
    const quests: CustomQuest[] = story
      .filter(isStoryCustomQuest)
      .map(this.transformIds.bind(this));

    const itemBuilds = story
      .filter(isStoryItemBuild)
      .map(this.transformIds.bind(this));

    const itemGroups = story
      .filter(isStoryAcceptedItemGroup)
      .map(this.transformIds.bind(this));

    if (itemBuilds.length) {
      this.debug(
        `${itemBuilds.length} item build template(s) detected in '${fileName}'`
      );
    }

    if (itemGroups.length) {
      this.debug(
        `${itemGroups.length} item group(s) detected in '${fileName}'`
      );
    }

    const expandedQuests = this.expandRepeatableQuests(quests);

    const questGen = new QuestsGenerator(
      expandedQuests,
      this.config.default_quest_name_prefix,
      itemBuilds,
      itemGroups,
      this.db,
      this.logger
    );

    // array of tuple [quest, questLocales]
    const questsPayloads = questGen.generateWithLocales();

    return questsPayloads.map(([quest, questLocales]) => {
      this.loadQuest(quest);
      this.loadLocales(quest._id, questLocales);

      return quest;
    });
  }

  private loadFile(fileName: string, dir: string): IQuest[] {
    const fullPath = join(dir, fileName);

    const storyOrQuest = readJsonFile<StoryItem | StoryItem[]>(fullPath);
    const story = "length" in storyOrQuest ? storyOrQuest : [storyOrQuest];

    return this.injectStory(story, fileName);
  }
}
