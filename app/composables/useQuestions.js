// Gestion des questions : catégories actives (base ou recharge) + tirage sans remise.
import questionPacks from "~/data/questions.mjs";
import themePacks from "~/data/themes.mjs";
import { CATEGORIES, CAT_KEYS, ageGroupFor, themeGroupFor } from "./useGame.js";

// Catégories actives : le plateau garde ses 6 couleurs, seule la signification change
export function catInfo(slotKey, activeTheme) {
  const idx = CAT_KEYS.indexOf(slotKey);
  if (activeTheme) {
    const pack = themePacks[activeTheme];
    const k = Object.keys(pack.categories)[idx];
    return { key: k, name: pack.categories[k], color: CATEGORIES[slotKey].color, icon: pack.icon };
  }
  return { key: slotKey, name: CATEGORIES[slotKey].name, color: CATEGORIES[slotKey].color, icon: CATEGORIES[slotKey].icon };
}

// Tirage sans remise : une question ne revient qu'après épuisement de son pool
function drawFromBag(bags, bagKey, pool) {
  if (!bags[bagKey] || bags[bagKey].length === 0) {
    bags[bagKey] = pool.map((_, i) => i);
    for (let i = bags[bagKey].length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bags[bagKey][i], bags[bagKey][j]] = [bags[bagKey][j], bags[bagKey][i]];
    }
  }
  return pool[bags[bagKey].pop()];
}

export function pickQuestion(game, player, slotKey) {
  const info = catInfo(slotKey, game.activeTheme);
  if (game.activeTheme) {
    const pack = themePacks[game.activeTheme];
    const group = pack.groups[themeGroupFor(player.age)];
    let pool = group.questions.filter(q => q[0] === info.key);
    if (pool.length === 0) pool = group.questions.slice();
    return drawFromBag(game.drawBags, "T::" + game.activeTheme + "::" + themeGroupFor(player.age) + "::" + info.key, pool);
  }
  const pack = questionPacks[ageGroupFor(player.age)];
  let pool = pack.questions.filter(q => q[0] === info.key);
  if (pool.length === 0) pool = pack.questions.slice();
  return drawFromBag(game.drawBags, player.group + "::" + info.key, pool);
}

export { questionPacks, themePacks };
