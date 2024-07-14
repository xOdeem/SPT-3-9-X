/* eslint-disable @typescript-eslint/naming-convention */
import { WTTInstanceManager } from "./WTTInstanceManager";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { JsonUtil } from "@spt/utils/JsonUtil";

export class QuestModifier {
    /**
     * Modify the quests in the given tables using the provided JSON utility.
     *
     * @param {IDatabaseTables} tables - the tables containing the quests
     * @param {JsonUtil} jsonUtil - the JSON utility for cloning objects
     * @return {void} 
     */
    public modifyQuests(tables: IDatabaseTables, jsonUtil: JsonUtil, debug: boolean): void {
        // Define the new suppressors
        const newSuppressors = [
            "664b9a4798222d80ce536df6"
        ];

        // Get the specific quest
        const punisher2 = tables.templates.quests["59c50c8886f7745fed3193bf"];
        if (punisher2) {
            // Extract existing suppressors
            const existingPunisher2Suppressors = punisher2.conditions.AvailableForFinish[0].counter.conditions[0].weaponModsInclusive;
            try {
                // Clone the existing suppressors array
                const updatedSuppressors = jsonUtil.clone(existingPunisher2Suppressors);
                let modified = false;

                // Flatten the nested arrays for easier checking
                const flattenedSuppressors = updatedSuppressors.flat();

                // Add new suppressors if they do not already exist
                for (const suppressor of newSuppressors) {
                    if (!flattenedSuppressors.includes(suppressor)) {
                        updatedSuppressors.push([suppressor]);
                        modified = true;

                        if (debug) {
                            console.log("Added new suppressor:", suppressor);
                        }
                    } else {
                        if (debug) {
                            console.log("Suppressor already exists:", suppressor);
                        }
                    }
                }

                // Only update the quest if modifications were made
                if (modified) {
                    punisher2.conditions.AvailableForFinish[0].counter.conditions[0].weaponModsInclusive = updatedSuppressors;

                    if (debug) {
                        console.log("Modified quest:", punisher2.conditions.AvailableForFinish[0].counter.conditions[0].weaponModsInclusive);
                    }
                }
            } catch (error) {
                console.error("Error modifying quests:", error);
            }
        }
    }

}
