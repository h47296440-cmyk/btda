import { Structure, Soldier, SoldierType, SoldierStance, MaterialType, TurretType } from './types';
import {
  STARTING_BUDGET,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  BOMB_CONFIG,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  ENEMY_BUILD_ZONE,
} from './gameConfig';

export interface EnemyCastleBuildResult {
  structures: Structure[];
  soldiers: Soldier[];
  hasBomb: boolean;
  remainingFunds: number;
  strategyName: string;
}

export interface EnemyTacticalCommand {
  newStances: { id: string; stance: SoldierStance }[];
  overallStance: SoldierStance;
  bannerMessage?: string;
}

/**
 * Procedural Dynamic AI Castle Builder
 * Mathematically calculates fortifications, choke points, turrets, and armies within the exact player budget.
 */
export function generateEnemySetup(
  startingBudget: number = STARTING_BUDGET,
  seed?: number
): EnemyCastleBuildResult {
  const structures: Structure[] = [];
  const soldiers: Soldier[] = [];
  let budget = startingBudget;

  // Archetype profiles influencing budget distribution & structural layout
  const archetypes = [
    {
      id: 'iron_fortress',
      name: '鉄壁要塞・本陣直掩陣',
      bombPriority: true,
      wallRatio: 0.38,
      turretRatio: 0.34,
      preferredWall: 'stone_wall' as MaterialType,
      secondaryWall: 'iron_wall' as MaterialType,
      preferredTurrets: ['cannon_battery', 'arrow_tower', 'catapult'] as TurretType[],
      soldierPref: ['samurai', 'archer', 'sapper'] as SoldierType[],
      defaultStance: 'defense' as SoldierStance,
    },
    {
      id: 'crimson_rush',
      name: '疾風怒濤・騎馬猛攻軍団',
      bombPriority: true,
      wallRatio: 0.22,
      turretRatio: 0.25,
      preferredWall: 'spike_wall' as MaterialType,
      secondaryWall: 'wood_wall' as MaterialType,
      preferredTurrets: ['fire_tower', 'arrow_tower'] as TurretType[],
      soldierPref: ['cavalry', 'cavalry', 'sapper', 'archer'] as SoldierType[],
      defaultStance: 'attack' as SoldierStance,
    },
    {
      id: 'double_cannon',
      name: '轟音遠投・連装砲台陣',
      bombPriority: false,
      wallRatio: 0.32,
      turretRatio: 0.42,
      preferredWall: 'stone_wall' as MaterialType,
      secondaryWall: 'spike_wall' as MaterialType,
      preferredTurrets: ['cannon_battery', 'catapult', 'fire_tower'] as TurretType[],
      soldierPref: ['samurai', 'archer', 'cavalry'] as SoldierType[],
      defaultStance: 'hybrid' as SoldierStance,
    },
    {
      id: 'sapper_trap',
      name: '破城工兵・罠城迷宮陣',
      bombPriority: true,
      wallRatio: 0.30,
      turretRatio: 0.28,
      preferredWall: 'spike_wall' as MaterialType,
      secondaryWall: 'iron_wall' as MaterialType,
      preferredTurrets: ['fire_tower', 'catapult'] as TurretType[],
      soldierPref: ['sapper', 'sapper', 'cavalry', 'samurai'] as SoldierType[],
      defaultStance: 'attack' as SoldierStance,
    },
    {
      id: 'balanced_bastion',
      name: '剛柔兼備・名将陣',
      bombPriority: true,
      wallRatio: 0.33,
      turretRatio: 0.33,
      preferredWall: 'stone_wall' as MaterialType,
      secondaryWall: 'iron_wall' as MaterialType,
      preferredTurrets: ['arrow_tower', 'cannon_battery', 'fire_tower'] as TurretType[],
      soldierPref: ['samurai', 'archer', 'cavalry', 'sapper'] as SoldierType[],
      defaultStance: 'hybrid' as SoldierStance,
    },
    {
      id: 'twin_citadel',
      name: '双璧重層・防衛城塞陣',
      bombPriority: true,
      wallRatio: 0.36,
      turretRatio: 0.34,
      preferredWall: 'stone_wall' as MaterialType,
      secondaryWall: 'wood_wall' as MaterialType,
      preferredTurrets: ['arrow_tower', 'fire_tower', 'catapult'] as TurretType[],
      soldierPref: ['samurai', 'archer', 'cavalry'] as SoldierType[],
      defaultStance: 'defense' as SoldierStance,
    },
  ];

  const profileIdx =
    seed !== undefined
      ? seed % archetypes.length
      : Math.floor(Math.random() * archetypes.length);
  const profile = archetypes[profileIdx];

  // 1. Tactical Bomb Allocation
  let hasBomb = false;
  if (profile.bombPriority && budget >= BOMB_CONFIG.cost) {
    budget -= BOMB_CONFIG.cost;
    hasBomb = true;
  }

  // Placement Helpers
  const isOccupied = (x: number, y: number, radius: number) => {
    // Check overlap with objectives
    const maru1 = { x: 980, y: 190, r: 40 };
    const maru2 = { x: 980, y: FIELD_HEIGHT - 190, r: 40 };
    const honjin = { x: 1140, y: FIELD_HEIGHT / 2, r: 50 };
    if (Math.hypot(x - maru1.x, y - maru1.y) < radius + maru1.r) return true;
    if (Math.hypot(x - maru2.x, y - maru2.y) < radius + maru2.r) return true;
    if (Math.hypot(x - honjin.x, y - honjin.y) < radius + honjin.r) return true;

    // Check overlap with existing structures
    for (const st of structures) {
      if (Math.hypot(x - st.x, y - st.y) < radius + (st.width || 36) / 2) {
        return true;
      }
    }
    return false;
  };

  const addWall = (x: number, y: number, type: MaterialType): boolean => {
    const def = WALL_DEFS[type];
    if (budget < def.cost) return false;
    const clampedX = Math.max(ENEMY_BUILD_ZONE.minX + 18, Math.min(ENEMY_BUILD_ZONE.maxX - 18, x));
    const clampedY = Math.max(ENEMY_BUILD_ZONE.minY + 18, Math.min(ENEMY_BUILD_ZONE.maxY - 18, y));
    if (isOccupied(clampedX, clampedY, 16)) return false;

    budget -= def.cost;
    structures.push({
      id: 'enemy_wall_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      x: clampedX,
      y: clampedY,
      width: 36,
      height: 36,
      hp: def.hp!,
      maxHp: def.hp!,
      cost: def.cost,
      spikeDamage: type === 'spike_wall' ? 20 : 0,
    });
    return true;
  };

  const addTurret = (x: number, y: number, type: TurretType): boolean => {
    const def = TURRET_DEFS[type];
    if (budget < def.cost) return false;
    const clampedX = Math.max(ENEMY_BUILD_ZONE.minX + 25, Math.min(ENEMY_BUILD_ZONE.maxX - 25, x));
    const clampedY = Math.max(ENEMY_BUILD_ZONE.minY + 25, Math.min(ENEMY_BUILD_ZONE.maxY - 25, y));
    if (isOccupied(clampedX, clampedY, 22)) return false;

    budget -= def.cost;
    structures.push({
      id: 'enemy_turret_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      x: clampedX,
      y: clampedY,
      width: 44,
      height: 44,
      hp: def.hp!,
      maxHp: def.hp!,
      cost: def.cost,
      range: def.range!,
      attackPower: def.attack!,
      attackCooldown:
        type === 'fire_tower' ? 0.35 : type === 'arrow_tower' ? 1.0 : type === 'cannon_battery' ? 2.3 : 3.0,
      lastAttackTime: 0,
    });
    return true;
  };

  const addSoldier = (x: number, y: number, type: SoldierType, stance: SoldierStance): boolean => {
    const def = SOLDIER_DEFS[type];
    if (budget < def.cost) return false;
    const clampedX = Math.max(ENEMY_BUILD_ZONE.minX + 20, Math.min(ENEMY_BUILD_ZONE.maxX - 20, x));
    const clampedY = Math.max(ENEMY_BUILD_ZONE.minY + 20, Math.min(ENEMY_BUILD_ZONE.maxY - 20, y));

    budget -= def.cost;
    soldiers.push({
      id: 'enemy_sol_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      stance,
      x: clampedX,
      y: clampedY,
      targetX: clampedX,
      targetY: clampedY,
      hp: def.hp!,
      maxHp: def.hp!,
      speed: def.speed!,
      attackPower: def.attack!,
      attackRange: type === 'archer' ? 190 : type === 'cavalry' ? 34 : 28,
      attackCooldown:
        type === 'samurai' ? 0.8 : type === 'archer' ? 1.2 : type === 'cavalry' ? 1.1 : 1.0,
      lastAttackTime: 0,
      targetId: null,
      targetType: null,
      siegeMultiplier: type === 'sapper' ? 3.5 : 1.0,
      cost: def.cost,
      kills: 0,
      facing: Math.PI,
    });
    return true;
  };

  // 2. Procedural Fortification Construction (Wall Budget Allocation)
  const targetWallBudget = startingBudget * profile.wallRatio;
  let spentWallBudget = 0;

  // Geometry: Build protective outer front ramparts around Ninomaru (top) and Sannomaru (bottom)
  const frontWallX = 910 + Math.floor(Math.random() * 25);
  // Top Maru defensive arc
  for (let y = 110; y <= 270; y += 38) {
    if (spentWallBudget >= targetWallBudget) break;
    const wallType = Math.random() < 0.25 ? profile.secondaryWall : profile.preferredWall;
    if (addWall(frontWallX, y, wallType)) {
      spentWallBudget += WALL_DEFS[wallType].cost;
    }
  }

  // Bottom Maru defensive arc
  for (let y = FIELD_HEIGHT - 270; y <= FIELD_HEIGHT - 110; y += 38) {
    if (spentWallBudget >= targetWallBudget) break;
    const wallType = Math.random() < 0.25 ? profile.secondaryWall : profile.preferredWall;
    if (addWall(frontWallX, y, wallType)) {
      spentWallBudget += WALL_DEFS[wallType].cost;
    }
  }

  // Honjin Inner Redoubt Barricade
  const honjinWallX = 1100 + Math.floor(Math.random() * 20);
  for (let y = FIELD_HEIGHT / 2 - 45; y <= FIELD_HEIGHT / 2 + 45; y += 40) {
    if (spentWallBudget >= targetWallBudget) break;
    const wallType = profile.secondaryWall || profile.preferredWall;
    if (addWall(honjinWallX, y, wallType)) {
      spentWallBudget += WALL_DEFS[wallType].cost;
    }
  }

  // Choke point side spurs
  if (spentWallBudget < targetWallBudget) {
    addWall(frontWallX + 40, 100, profile.preferredWall);
    addWall(frontWallX + 40, FIELD_HEIGHT - 100, profile.preferredWall);
  }

  // 3. Procedural Turret Placement (Turret Budget Allocation)
  const targetTurretBudget = startingBudget * profile.turretRatio;
  let spentTurretBudget = 0;

  // Primary tactical turret anchor positions
  const turretSlots = [
    { x: 975, y: 110, defaultType: profile.preferredTurrets[0] || 'arrow_tower' },
    { x: 975, y: FIELD_HEIGHT - 110, defaultType: profile.preferredTurrets[0] || 'arrow_tower' },
    { x: 1060, y: FIELD_HEIGHT / 2 - 70, defaultType: profile.preferredTurrets[1] || 'fire_tower' },
    { x: 1060, y: FIELD_HEIGHT / 2 + 70, defaultType: profile.preferredTurrets[1] || 'fire_tower' },
    { x: 1150, y: FIELD_HEIGHT / 2 - 80, defaultType: profile.preferredTurrets[2] || 'catapult' },
    { x: 1150, y: FIELD_HEIGHT / 2 + 80, defaultType: profile.preferredTurrets[2] || 'cannon_battery' },
  ];

  for (const slot of turretSlots) {
    if (spentTurretBudget >= targetTurretBudget) break;
    const turretType = slot.defaultType;
    if (addTurret(slot.x, slot.y, turretType)) {
      spentTurretBudget += TURRET_DEFS[turretType].cost;
    }
  }

  // 4. Procedural Army Recruitment (Remaining Budget Allocation)
  // Recruit balanced or specialized army based on profile preferences
  let soldierIdx = 0;
  while (budget >= 110) {
    const soldierType = profile.soldierPref[soldierIdx % profile.soldierPref.length];
    const def = SOLDIER_DEFS[soldierType];

    if (budget < def.cost) {
      // If cannot afford preferred, try cheapest available soldier (archer: 110 or sapper: 130)
      if (budget >= 110) {
        const fallbackType: SoldierType = budget >= 140 ? 'samurai' : budget >= 130 ? 'sapper' : 'archer';
        const stance: SoldierStance = fallbackType === 'sapper' ? 'attack' : profile.defaultStance;
        addSoldier(880 + Math.random() * 80, FIELD_HEIGHT / 2 + (Math.random() * 280 - 140), fallbackType, stance);
      }
      break;
    }

    // Determine initial tactical spawn location and stance based on unit role
    let spawnX = 880;
    let spawnY = FIELD_HEIGHT / 2;
    let stance = profile.defaultStance;

    if (soldierType === 'cavalry') {
      spawnX = 860 + Math.random() * 30;
      spawnY = soldierIdx % 2 === 0 ? 160 + Math.random() * 80 : FIELD_HEIGHT - (160 + Math.random() * 80);
      stance = 'attack';
    } else if (soldierType === 'sapper') {
      spawnX = 850 + Math.random() * 30;
      spawnY = FIELD_HEIGHT / 2 + (Math.random() * 160 - 80);
      stance = 'attack';
    } else if (soldierType === 'archer') {
      spawnX = 940 + Math.random() * 80;
      spawnY = soldierIdx % 2 === 0 ? 190 : FIELD_HEIGHT - 190;
      stance = profile.defaultStance === 'attack' ? 'hybrid' : 'defense';
    } else {
      // Samurai
      spawnX = 900 + Math.random() * 60;
      spawnY = soldierIdx % 2 === 0 ? 210 : FIELD_HEIGHT - 210;
      stance = profile.defaultStance;
    }

    if (addSoldier(spawnX, spawnY, soldierType, stance)) {
      soldierIdx++;
    } else {
      soldierIdx++;
    }
  }

  return {
    structures,
    soldiers,
    hasBomb,
    remainingFunds: budget,
    strategyName: profile.name,
  };
}

/**
 * In-Battle AI Dynamic Tactical Stance Evaluation (状況による作戦切り替え)
 * The CPU commander assesses battlefield conditions and switches unit stances in real time.
 */
export function evaluateEnemyTacticalStance(
  soldiers: Soldier[],
  structures: Structure[],
  currentEnemyStance: SoldierStance,
  battleTime: number
): EnemyTacticalCommand | null {
  const livingEnemySoldiers = soldiers.filter(s => s.team === 'enemy' && s.hp > 0);
  const livingPlayerSoldiers = soldiers.filter(s => s.team === 'player' && s.hp > 0);
  if (livingEnemySoldiers.length === 0) return null;

  // 1. Condition: Threat to Home Base (CRISIS / DEFENSE)
  // Check if player units have infiltrated enemy territory (x >= 780)
  const invaders = livingPlayerSoldiers.filter(s => s.x >= 760);
  const enemyHonjin = structures.find(s => s.team === 'enemy' && s.objectiveType === 'honjin');
  const enemyMaruUnderAttack = structures.some(
    s => s.team === 'enemy' && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp < s.maxHp * 0.45 && s.hp > 0
  );
  const isHonjinUnderAttack = enemyHonjin && !enemyHonjin.isInvulnerable && enemyHonjin.hp < enemyHonjin.maxHp;

  if ((invaders.length >= 2 || isHonjinUnderAttack || enemyMaruUnderAttack) && currentEnemyStance !== 'defense') {
    // Switch defenders & archers to Defense to eliminate intruders
    const newStances = livingEnemySoldiers.map(soldier => {
      // Sappers maintain siege or hybrid, others rush to defend
      if (soldier.type === 'sapper') return { id: soldier.id, stance: 'attack' as SoldierStance };
      return { id: soldier.id, stance: 'defense' as SoldierStance };
    });

    return {
      newStances,
      overallStance: 'defense',
      bannerMessage: '【敵将号令】「本陣を死守せよ！侵入敵兵を迎撃せよ！」防衛体制発令！',
    };
  }

  // 2. Condition: Offensive Breakthrough (ALL-OUT ATTACK / 突撃号令)
  // Check if player Maru 1 or 2 is destroyed, or enemy has heavy soldier numerical superiority
  const playerMaruDestroyed = structures.filter(
    s => s.team === 'player' && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp <= 0
  ).length;

  const playerHonjinExposed = playerMaruDestroyed >= 2;
  const numericalAdvantage = livingEnemySoldiers.length >= livingPlayerSoldiers.length * 1.4 && invaders.length === 0;

  if ((playerHonjinExposed || playerMaruDestroyed >= 1 || numericalAdvantage) && currentEnemyStance !== 'attack' && invaders.length === 0) {
    const newStances = livingEnemySoldiers.map(soldier => ({
      id: soldier.id,
      stance: 'attack' as SoldierStance,
    }));

    return {
      newStances,
      overallStance: 'attack',
      bannerMessage: playerHonjinExposed
        ? '【敵将号令】「敵本陣の結界は崩れた！全軍、敵本陣へ総突撃せよ！」'
        : '【敵将号令】「敵の隙を突け！全軍突撃陣形へ移行！」',
    };
  }

  // 3. Condition: Midfield Stalemate / Flexible Guerrilla (HYBRID / 遊撃作戦)
  if (currentEnemyStance !== 'hybrid' && invaders.length === 0 && !playerHonjinExposed && Math.abs(livingEnemySoldiers.length - livingPlayerSoldiers.length) <= 2) {
    const newStances = livingEnemySoldiers.map(soldier => {
      if (soldier.type === 'cavalry' || soldier.type === 'sapper') {
        return { id: soldier.id, stance: 'attack' as SoldierStance };
      }
      return { id: soldier.id, stance: 'hybrid' as SoldierStance };
    });

    return {
      newStances,
      overallStance: 'hybrid',
      bannerMessage: '【敵将号令】「遊撃陣形を展開し、臨機応変に攻防せよ！」',
    };
  }

  return null;
}

/**
 * AI in-battle Tactical Bomb Evaluation
 * Checks for tight player soldier clusters or players sieging enemy structures.
 */
export function evaluateEnemyTacticalBomb(
  soldiers: Soldier[],
  structures: Structure[],
  enemyHasBomb: boolean,
  enemyIsBombUsed: boolean,
  battleTimeSeconds: number
): { targetX: number; targetY: number } | null {
  if (!enemyHasBomb || enemyIsBombUsed || battleTimeSeconds < 12) {
    return null;
  }

  const livingPlayerSoldiers = soldiers.filter(s => s.team === 'player' && s.hp > 0);
  if (livingPlayerSoldiers.length === 0) return null;

  // 1. Check for clusters of player soldiers
  let bestCluster: { x: number; y: number; count: number } = { x: 0, y: 0, count: 0 };

  for (const s1 of livingPlayerSoldiers) {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (const s2 of livingPlayerSoldiers) {
      if (Math.hypot(s1.x - s2.x, s1.y - s2.y) <= BOMB_CONFIG.radius * 1.1) {
        count++;
        sumX += s2.x;
        sumY += s2.y;
      }
    }
    if (count > bestCluster.count) {
      bestCluster = { x: sumX / count, y: sumY / count, count };
    }
  }

  // If 2 or more player soldiers are grouped, drop bomb
  if (bestCluster.count >= 2) {
    return { targetX: bestCluster.x, targetY: bestCluster.y };
  }

  // 2. Check if player soldiers are attacking enemy Maru or Honjin
  const threatenedEnemyObjectives = structures.filter(
    st => st.team === 'enemy' && st.isObjective && st.hp > 0
  );

  for (const obj of threatenedEnemyObjectives) {
    const attackers = livingPlayerSoldiers.filter(s => Math.hypot(s.x - obj.x, s.y - obj.y) <= 160);
    if (attackers.length >= 1) {
      const avgX = attackers.reduce((acc, a) => acc + a.x, 0) / attackers.length;
      const avgY = attackers.reduce((acc, a) => acc + a.y, 0) / attackers.length;
      return { targetX: avgX, targetY: avgY };
    }
  }

  // 3. Fallback: if battle > 35s, target the most advanced player unit
  if (battleTimeSeconds > 35 && livingPlayerSoldiers.length > 0) {
    const leadSoldier = [...livingPlayerSoldiers].sort((a, b) => b.x - a.x)[0];
    return { targetX: leadSoldier.x, targetY: leadSoldier.y };
  }

  return null;
}

/**
 * AI in-battle Reinforcements Evaluation
 * Spawns reinforcements using accumulated battle funds gained from kills and starting budget.
 */
export function evaluateEnemyReinforcements(
  enemyFunds: number,
  soldiers: Soldier[],
  structures: Structure[],
  currentTime: number,
  lastSpawnTime: number
): { type: SoldierType; stance: SoldierStance; cost: number; message: string } | null {
  if (enemyFunds < 110 || currentTime - lastSpawnTime < 5.0) {
    return null;
  }

  const livingPlayerSoldiers = soldiers.filter(s => s.team === 'player' && s.hp > 0);

  // If player troops are inside enemy territory, spawn defense samurai or archer
  const invaders = livingPlayerSoldiers.filter(s => s.x >= 750);
  if (invaders.length > 0 && enemyFunds >= 140) {
    return {
      type: 'samurai',
      stance: 'defense',
      cost: 140,
      message: '【敵軍防衛増援】敵軍が本陣防衛の侍部隊を出撃！',
    };
  }

  // If player base has fallen Maru, spawn aggressive Cavalry or Sapper
  const playerMaruDown = structures.some(
    s => s.team === 'player' && s.isObjective && s.objectiveType !== 'honjin' && s.hp <= 0
  );

  if (playerMaruDown && enemyFunds >= 180) {
    return {
      type: 'cavalry',
      stance: 'attack',
      cost: 180,
      message: '【敵軍突撃増援】敵軍が好機と見て騎馬強襲部隊を出撃！',
    };
  }

  if (enemyFunds >= 130 && Math.random() < 0.5) {
    return {
      type: 'sapper',
      stance: 'attack',
      cost: 130,
      message: '【敵軍破城増援】敵軍が工兵部隊を出撃！',
    };
  }

  if (enemyFunds >= 110) {
    return {
      type: 'archer',
      stance: 'hybrid',
      cost: 110,
      message: '【敵軍援護増援】敵軍が弓兵部隊を出撃！',
    };
  }

  return null;
}
