const utils = require('./utils');
const RewardsGenerator = require('./RewardsGenerator');

const FALLBACK_LOCALE = 'en';
const DEFAULT_IMAGE_ID = '5a27cafa86f77424e20615d6';
const DEFAULT_LOCATION = 'any';
const DEFAULT_TYPE = 'Completion';
const DEFAULT_SUCCESS_MESSAGE = 'Quest successfully completed';
const DEFAULT_PLANT_TIME = 30;

const QUEST_STATUS_SUCCESS = [QuestHelper.status.Success];
const QUEST_STATUS_STARTED = [QuestHelper.status.Started, QuestHelper.status.Success];

const BEACON_ITEM_ID = '5991b51486f77447b112d44f';

const TRADER_ALIASES = {
  prapor: '54cb50c76803fa8b248b4571',
  therapist: '54cb57776803fa99248b456e',
  fence: '579dc571d53a0658a154fbec',
  skier: '58330581ace78e27b8b10cee',
  peacekeeper: '5935c25fb3acc3127c3d8cd9',
  mechanic: '5a7c2eca46aef81a7ca2145d',
  ragman: '5ac3b934156ae10c4430e83c',
  jaeger: '5c0647fdd443bc2504c2d371',
}

const LOCATION_ALIASES = {
  bigmap: '56f40101d2720b2a4d8b45d6',
  customs: '56f40101d2720b2a4d8b45d6',
  factory: '55f2d3fd4bdc2d5f408b4567',
  factory4_day: '55f2d3fd4bdc2d5f408b4567',
  factory4_night: '59fc81d786f774390775787e',
  interchange: '5714dbc024597771384a510d',
  laboratory: '5b0fc42d86f7744a585f9105',
  lighthouse: '5704e4dad2720bb55b8b4567',
  rezervbase: '5704e5fad2720bc05b8b4567',
  reserve: '5704e5fad2720bc05b8b4567',
  shoreline: '5704e554d2720bac5b8b456e',
  woods: '5704e3c2d2720bac5b8b4567',
}

function generateKillConditionId(questId, mission) {
  return utils.getSHA256(JSON.stringify([mission.type, mission.count, mission.target, mission.locations, questId]));
}

function generateGiveItemConditionId(questId, mission) {
  const fir = mission.found_in_raid_only || false;
  return utils.getSHA256(JSON.stringify([mission.type, mission.accepted_items, mission.count, fir, questId]));
}

function generatePlaceBeaconConditionId(questId, mission) {
  return utils.getSHA256(JSON.stringify([mission.type, mission.zone_id, mission.plant_time, mission.should_exit_locations, questId]));
}

class ConditionsGenerator {
  constructor(customQuest, dependencyQuest) {
    this.customQuest = customQuest;
    this.dependencyQuest = dependencyQuest;
  }

  static setPropsIndexes(conditions) {
    return conditions
      .filter(payload => Boolean(payload))
      .map((payload, index) => {
        return {
          ...payload,
          _props: {
            ...payload._props,
            index,
          },
        };
      });
  }

  _generateLevelCondition() {
    const level_needed = this.customQuest.level_needed;
    const qid = this.customQuest.id;

    if (level_needed > 1) {
      return {
        "_parent": "Level",
        "_props": {
          "id": `${qid}_level_condition`,
          "parentId": "",
          "dynamicLocale": false,
          "value": level_needed,
          "compareMethod": ">=",
          "visibilityConditions": []
        },
        "dynamicLocale": false
      }
    }
  }

  _generateQuestCondition(questId, status = QUEST_STATUS_SUCCESS) {
    if (questId) {
      return {
        "_parent": "Quest",
        "_props": {
          "id": "",
          "parentId": "",
          "dynamicLocale": false,
          "target": questId,
          "status": status,
        },
        "dynamicLocale": false
      }
    }
  }

  _generateAvailableForStart() {
    const locked_by_quests = this.customQuest.locked_by_quests || [];
    const unlock_on_quest_start = this.customQuest.unlock_on_quest_start || [];

    const levelCondition = this._generateLevelCondition();

    const dependencyQuestCondition = this._generateQuestCondition(this.dependencyQuest, QUEST_STATUS_SUCCESS);
    const questSuccessConditions = locked_by_quests.map(questId => this._generateQuestCondition(questId, QUEST_STATUS_SUCCESS));
    const questStartedConditions = unlock_on_quest_start.map(questId => this._generateQuestCondition(questId, QUEST_STATUS_STARTED));

    return ConditionsGenerator.setPropsIndexes([levelCondition, dependencyQuestCondition, ...questSuccessConditions, ...questStartedConditions]);
  }

  _generateKillCondition(mission) {
    const killConditionId = generateKillConditionId(this.customQuest.id, mission);

    if (mission.count > 0) {
      const conditions = [
        {
          "_parent": "Kills",
          "_props": {
            // target = 'Savage' | 'AnyPmc' | 'Bear' | 'Usec
            "target": mission.target,
            "compareMethod": ">=",
            "value": "1",
            "id": `${killConditionId}_kill`
          }
        },
        mission.locations && mission.locations !== 'any' ? {
          "_parent": "Location",
          "_props": {
            "target": mission.locations,
            "id": `${killConditionId}_location`
          }
        } : null,
      ].filter(c => Boolean(c));

      return {
        "_parent": "CounterCreator",
        "_props": {
          "counter": {
            "id": `${killConditionId}_counter`,
            "conditions": conditions
          },
          "id": killConditionId,
          "parentId": "",
          "oneSessionOnly": false,
          "dynamicLocale": false,
          "type": "Elimination",
          "doNotResetIfCounterCompleted": false,
          "value": String(mission.count),
          "visibilityConditions": []
        },
        "dynamicLocale": false
      };
    }
  }

  _generateGiveItemCondition(mission) {
    const items = mission.accepted_items;
    const count = mission.count;
    const fir = mission.found_in_raid_only || false;

    if (!items || !items.length || count <= 0) {
      return null;
    }

    const id = generateGiveItemConditionId(this.customQuest.id, mission);

    return {
      "_parent": "HandoverItem",
      "_props": {
        id,
        "dogtagLevel": 0,
        "maxDurability": 100,
        "minDurability": 0,
        "parentId": "",
        "onlyFoundInRaid": fir,
        "dynamicLocale": false,
        "target": items,
        "value": String(count),
        "visibilityConditions": []
      },
      "dynamicLocale": false
    }
  }

  _generatePlaceBeaconCondition(mission) {
    const qid = this.customQuest.id;

    if (!mission.zone_id) {
      Logger.warning(`=> Custom Quests: no zone_id provided for mission of type '${mission.type}' (concerned quest: ${qid})`)
      return null;
    }

    const id = generatePlaceBeaconConditionId(qid, mission);

    return {
      "_parent": "PlaceBeacon",
      "_props": {
        id,
        "parentId": "",
        "dynamicLocale": false,
        "plantTime": mission.plant_time || DEFAULT_PLANT_TIME,
        "zoneId": mission.zone_id,
        "target": [
          BEACON_ITEM_ID,
        ],
        "value": "1",
        "visibilityConditions": []
      },
      "dynamicLocale": false
    }
  }

  _generateAvailableForFinish() {
    const missions = this.customQuest.missions || [];
    return missions
      .map(mission => {
        if (mission.type === 'Kill') {
          return this._generateKillCondition(mission);
        } else if (mission.type === 'GiveItem') {
          return this._generateGiveItemCondition(mission);
        } else if (mission.type === 'PlaceBeacon') {
          return this._generatePlaceBeaconCondition(mission);
        }

        Logger.warning(`=> Custom Quests: ignored mission with type '${mission.type}'`)

        return null;
      }).filter(item => Boolean(item));
  }

  _generateFail() {
    // TODO
    return [];
  }

  generateConditions() {
    return {
      AvailableForStart: this._generateAvailableForStart(),
      AvailableForFinish: this._generateAvailableForFinish(),
      Fail: this._generateFail(),
    }
  }
}

class CustomQuestsTransformer {
  constructor(customQuest, dependencyQuest) {
    this.customQuest = customQuest;
    this.dependencyQuest = dependencyQuest;

    this.conditionsGenerator = new ConditionsGenerator(customQuest, dependencyQuest);
    this.rewardsGenerator = new RewardsGenerator(customQuest);
  }

  _getTraderId() {
    const traderId = this.customQuest.trader_id;

    const lowerCasedId = traderId.toLowerCase();
    if (TRADER_ALIASES[lowerCasedId]) {
      return TRADER_ALIASES[lowerCasedId];
    }

    return traderId;
  }

  _getLocation() {
    const location = this.customQuest.location || DEFAULT_LOCATION;

    const lowerCasedLocation = location.toLowerCase();
    if (LOCATION_ALIASES[lowerCasedLocation]) {
      return TRADER_ALIASES[lowerCasedLocation];
    }

    return location;
  }

  generateQuest() {
    const q = this.customQuest;
    const questId = q.id;
    const traderId = this._getTraderId();
    const image = `/files/quest/icon/${q.image || DEFAULT_IMAGE_ID}.jpg`;
    const location = q.location || DEFAULT_LOCATION;
    const type = q.type || DEFAULT_TYPE;
    const conditions = this.conditionsGenerator.generateConditions();
    const rewards = this.rewardsGenerator.generateRewards();

    return {
      QuestName: questId,
      _id: questId,
      image,
      type,
      traderId,
      location,
      conditions,
      rewards,
      canShowNotificationsInGame: true,
      description: `${questId} description`,
      failMessageText: `${questId} failMessageText`,
      name: `${questId} name`,
      note: `${questId} note`,
      isKey: false,
      restartable: false,
      instantComplete: false,
      secretQuest: false,
      startedMessageText: `${questId} startedMessageText`,
      successMessageText: q.success_message ? `${questId} successMessageText` : DEFAULT_SUCCESS_MESSAGE,
      templateId: questId,
    };
  }

  static getLocaleValue(givenPayload, localeName) {
    if (typeof givenPayload === 'string') {
      return givenPayload;
    }

    const payload = givenPayload || {};
    return payload[localeName] || payload[FALLBACK_LOCALE] || '';
  }

  getMissionId(mission) {
    const qid = this.customQuest.id;

    if (mission.type === 'Kill') {
      return generateKillConditionId(qid, mission);
    } else if (mission.type === 'GiveItem') {
      return generateGiveItemConditionId(qid, mission);
    } else if (mission.type === 'PlaceBeacon') {
      return generatePlaceBeaconConditionId(qid, mission);
    }
    return null;
  }

  generateLocales(generatedQuest) {
    const { name, description, success_message, missions } = this.customQuest;
    const { location, templateId } = generatedQuest;

    const result = {};

    utils.ALL_LOCALES.forEach(localeName => {
      const payload = {
        note: "",
        failMessageText: "",
        startedMessageText: "",
        location,
      };

      payload.name = CustomQuestsTransformer.getLocaleValue(name, localeName);
      payload.description = `${templateId}_description`;
      if (success_message) {
        payload.successMessageText = `${templateId}_success_message_text`;
      }

      payload.conditions = {};

      (missions || []).forEach(mission => {
        const missionId = this.getMissionId(mission);
        if (missionId) {
          payload.conditions[missionId] = CustomQuestsTransformer.getLocaleValue(mission.message, localeName);
        }
      })

      if (!result[localeName]) {
        result[localeName] = { quest: {}, mail: {} };
      }

      result[localeName].quest = payload;
      result[localeName].mail[payload.description] = CustomQuestsTransformer.getLocaleValue(description, localeName);

      if (success_message) {
        result[localeName].mail[payload.successMessageText] = CustomQuestsTransformer.getLocaleValue(success_message, localeName);
      }
    })

    return result;
  }
}

module.exports = CustomQuestsTransformer;