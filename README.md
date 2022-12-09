# Custom Quests
Easy quests creation tool for [SPT-AKI](https://www.sp-tarkov.com/)

Using [Custom Quests Editor](https://hub.sp-tarkov.com/files/file/596-custom-quests-editor/) will help you A LOT to create and edit json quests files.

[API Documentation - How to create quests](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md) (manually)

## Description
This mod allow to add your own quests easily with a single json file (per quest).

## Features
- [Online App: Custom Quests Editor](https://hub.sp-tarkov.com/files/file/596-custom-quests-editor/)
- Create a custom quest with a single json file
- [Quest chaining](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#chained-quests)
- Several mission types available: [`Kill`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#kill), [`GiveItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#giveitem), [`FindItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#finditem), [`PlaceItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#placeitem), [`VisitPlace`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#visitplace), [`PlaceBeacon` and `PlaceSignalJammer`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#placebeacon-and-placesignaljammer)
- [`GiveItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#giveitem), [`FindItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#finditem) and [`PlaceItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#placeitem) missions are compatible with [quest items](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/ALL_QUEST_ITEMS.md)
- [`Kill`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#kill) missions can have a `weapons_whitelist` to limit the kill count to certain weapon ids
- [Repeatable quests](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#repeatable-quests) (it's not vanilla daily quests)
- [Rewards](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#rewards): xp, reputations and items (with attachements using [`@build` directive](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#build-directive)) on quest success or quest start
- Group items ids using [`@group` directive](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#group-directive) (valable for `accepted_items` fields only)
- Compatible with modded traders (you still need to have the correct trader id)
- [Multilingual support](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md#multilingual-support)
- Options to wipe custom quests progression from profile (useful during the development)

## Usage
Place your json files in the `quests` directory.

Sub-directories can be used to organize your quest files.

So these are valid:
- quests/my_first_quest.json
- quests/my_quests/my_first_quest.json

Please read [the usage manual](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md) to get more infos on how to create your own quests.

Check [the examples](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/EXAMPLES.md) can help too.

You can rename the folder `examples.disabled` in `examples` to try out the examples ;-)

## Global configuration
- `enabled`: allow to enable or not CustomQuests mod
- `debug`: more verbose console
- `quest_directory`: The directory with custom quests
- `limit_repeated_quest`: The maximum number of time you can repeat a quest during the same game session (default to 1000). Please see [API Documentation - How to create quests](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/USAGE_MANUAL.md) for more details
- `at_start.disable_all_vanilla_quests`: Disable all vanilla quests (this will unlock Jaeger without editing your profile)
- `at_start.wipe_enabled_custom_quests_state_from_all_profiles`: wipe all enabled custom quests from all profiles

## Resources
- [All zones](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/ALL_ZONES.md)
- [All places](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/ALL_PLACES.md)
- [All quest items](https://github.com/guillaumearm/aki_CustomQuests/blob/master/docs/ALL_QUEST_ITEMS.md)

## Modding API
Since 2.2.0, you can inject custom quests dynamically from other mods.

In the `delayedLoad` method:

```ts
const myExampleQuest = {
  id: "trap_quest_example_1_with_api",
  trader_id: "mechanic",
  name: "My first quest",
  description: "My first quest description",
  success_message: "My success message",
};

// call this in `delayedLoad` method
const injectQuests = (logger: ILogger) => {
  if (!globalThis.CustomQuestsAPI) {
    logger.error(`CustomQuestsAPI not found, are you sure a version of CustomQuests >= 2.2.0 is installed ?`);
    return;
  }

  globalThis.CustomQuestsAPI.load([myExampleQuest]);
}
```

#### Typescript support
The `CustomQuestsAPI.load` method take an array of [`StoryItem`](https://github.com/guillaumearm/aki_CustomQuests/blob/master/src/mod.ts#L23) in parameter.

Check the [`CustomQuestsAPI` type definition](https://github.com/guillaumearm/aki_CustomQuests/blob/master/src/mod.ts#L23) for more details.


## Planned features
- New mission type: `SurviveRaid`
- More rewards: unlock traders and maps (with [Path To Tarkov](https://hub.sp-tarkov.com/files/file/498-path-to-tarkov/) compat)
- Unlock barters reward (I'm currently waiting for the next spt-aki version)
- More kill targets: bosses, raiders, rogues.
- Failure quests: this allow to create several path in your story
- Rewards on fail
- Custom quest image
- Mission type `Kill` improvements: limbs restrictions​
- Mission type `Kill` improvements: weapon attachments restrictions
- Mission type `Kill` improvements: weared equipment restrictions
- Mission type `Kill` improvements: range restrictions, physical effects restrictions
- Mission type `Kill` improvements: kill at certain time of the day (or night)
- New mission type: `WeaponAssembly` (allow to create gunsmith missions)
- New mission type: `TraderLoyalty`
- New mission type: `Skill`

If you have some ideas to improve the mod, you can create an issue on github (or comment on the hub) ;-)

## The original README

[The original readme file](https://github.com/guillaumearm/aki_CustomQuests/blob/master/README.md) is available on github.
