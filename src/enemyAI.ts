import { Structure, Soldier, SoldierType, SoldierStance, MaterialType, TurretType, Team } from './types';
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

export interface EnemySetupOptions {
  startingBudget?: number;
  seed?: number;
  team?: Team;
  buildZone?: { minX: number; maxX: number; minY: number; maxY: number };
  basePos?: {
    honjin: { x: number; y: number };
    maru1: { x: number; y: number };
    maru2: { x: number; y: number };
  };
  fieldWidth?: number;
  fieldHeight?: number;
}

/**
 * Procedural Dynamic AI Castle Builder
 * Mathematically calculates fortifications, choke points, turrets, and armies within the exact budget.
 * Supports any team, quadrant, and map dimensions.
 */
export function generateEnemySetup(
  budgetOrOptions?: number | EnemySetupOptions,
  legacySeed?: number
): EnemyCastleBuildResult {
  let opts: EnemySetupOptions = {};
  if (typeof budgetOrOptions === 'number') {
    opts = { startingBudget: budgetOrOptions, seed: legacySeed };
  } else if (budgetOrOptions) {
    opts = budgetOrOptions;
  }

  const startingBudget = opts.startingBudget ?? STARTING_BUDGET;
  const seed = opts.seed;
  const team: Team = opts.team ?? 'enemy';
  const fWidth = opts.fieldWidth ?? FIELD_WIDTH;
  const fHeight = opts.fieldHeight ?? FIELD_HEIGHT;

  const bZone = opts.buildZone ?? ENEMY_BUILD_ZONE;
  const bPos = opts.basePos ?? {
    honjin: { x: 1140, y: fHeight / 2 },
    maru1: { x: 980, y: 190 },
    maru2: { x: 980, y: fHeight - 190 },
  };

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
      name: '疾風怒濤・突撃猛攻軍団',
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
      ? Math.abs(seed) % archetypes.length
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
    const maru1 = { x: bPos.maru1.x, y: bPos.maru1.y, r: 40 };
    const maru2 = { x: bPos.maru2.x, y: bPos.maru2.y, r: 40 };
    const honjin = { x: bPos.honjin.x, y: bPos.honjin.y, r: 50 };
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
    const clampedX = Math.max(bZone.minX + 18, Math.min(bZone.maxX - 18, x));
    const clampedY = Math.max(bZone.minY + 18, Math.min(bZone.maxY - 18, y));
    if (isOccupied(clampedX, clampedY, 16)) return false;

    budget -= def.cost;
    structures.push({
      id: `${team}_wall_${Math.random().toString(36).substring(2, 9)}`,
      type,
      team,
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
    const clampedX = Math.max(bZone.minX + 25, Math.min(bZone.maxX - 25, x));
    const clampedY = Math.max(bZone.minY + 25, Math.min(bZone.maxY - 25, y));
    if (isOccupied(clampedX, clampedY, 22)) return false;

    budget -= def.cost;
    structures.push({
      id: `${team}_turret_${Math.random().toString(36).substring(2, 9)}`,
      type,
      team,
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
    const clampedX = Math.max(bZone.minX + 20, Math.min(bZone.maxX - 20, x));
    const clampedY = Math.max(bZone.minY + 20, Math.min(bZone.maxY - 20, y));

    budget -= def.cost;
    soldiers.push({
      id: `${team}_sol_${Math.random().toString(36).substring(2, 9)}`,
      type,
      team,
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
      facing: Math.atan2(fHeight / 2 - clampedY, fWidth / 2 - clampedX),
    });
    return true;
  };

  // Direction pointing toward map center
  const centerX = fWidth / 2;
  const centerY = fHeight / 2;
  const dirX = centerX - bPos.honjin.x;
  const dirY = centerY - bPos.honjin.y;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / dirLen;
  const ny = dirY / dirLen;
  const px = -ny;
  const py = nx;

  // 2. Procedural Fortification Construction (Wall Budget Allocation)
  const targetWallBudget = startingBudget * profile.wallRatio;
  let spentWallBudget = 0;

  // Front ramparts protecting Maru 1 (2 layers)
  for (let layer = 0; layer < 2; layer++) {
    const distOffset = 52 + layer * 36;
    const m1FrontX = bPos.maru1.x + nx * distOffset;
    const m1FrontY = bPos.maru1.y + ny * distOffset;
    for (let d = -76; d <= 76; d += 38) {
      if (spentWallBudget >= targetWallBudget) break;
      const wallType = Math.random() < 0.25 ? profile.secondaryWall : profile.preferredWall;
      if (addWall(m1FrontX + px * d, m1FrontY + py * d, wallType)) {
        spentWallBudget += WALL_DEFS[wallType].cost;
      }
    }
  }

  // Front ramparts protecting Maru 2 (2 layers)
  for (let layer = 0; layer < 2; layer++) {
    const distOffset = 52 + layer * 36;
    const m2FrontX = bPos.maru2.x + nx * distOffset;
    const m2FrontY = bPos.maru2.y + ny * distOffset;
    for (let d = -76; d <= 76; d += 38) {
      if (spentWallBudget >= targetWallBudget) break;
      const wallType = Math.random() < 0.25 ? profile.secondaryWall : profile.preferredWall;
      if (addWall(m2FrontX + px * d, m2FrontY + py * d, wallType)) {
        spentWallBudget += WALL_DEFS[wallType].cost;
      }
    }
  }

  // Inner Redoubt Barricades in front and flanks of Honjin
  for (let layer = 0; layer < 2; layer++) {
    const honjinFrontX = bPos.honjin.x + nx * (48 + layer * 36);
    const honjinFrontY = bPos.honjin.y + ny * (48 + layer * 36);
    for (let d = -60; d <= 60; d += 38) {
      if (spentWallBudget >= targetWallBudget) break;
      const wallType = profile.secondaryWall || profile.preferredWall;
      if (addWall(honjinFrontX + px * d, honjinFrontY + py * d, wallType)) {
        spentWallBudget += WALL_DEFS[wallType].cost;
      }
    }
  }

  // 3. Procedural Turret Placement (Turret Budget Allocation)
  const targetTurretBudget = startingBudget * profile.turretRatio;
  let spentTurretBudget = 0;

  const turretSlots = [
    {
      x: bPos.maru1.x + px * 46 + nx * 24,
      y: bPos.maru1.y + py * 46 + ny * 24,
      defaultType: profile.preferredTurrets[0] || 'arrow_tower',
    },
    {
      x: bPos.maru1.x - px * 46 + nx * 24,
      y: bPos.maru1.y - py * 46 + ny * 24,
      defaultType: profile.preferredTurrets[1] || 'fire_tower',
    },
    {
      x: bPos.maru2.x + px * 46 + nx * 24,
      y: bPos.maru2.y + py * 46 + ny * 24,
      defaultType: profile.preferredTurrets[0] || 'arrow_tower',
    },
    {
      x: bPos.maru2.x - px * 46 + nx * 24,
      y: bPos.maru2.y - py * 46 + ny * 24,
      defaultType: profile.preferredTurrets[1] || 'fire_tower',
    },
    {
      x: bPos.honjin.x + px * 64 + nx * 32,
      y: bPos.honjin.y + py * 64 + ny * 32,
      defaultType: profile.preferredTurrets[1] || 'fire_tower',
    },
    {
      x: bPos.honjin.x - px * 64 + nx * 32,
      y: bPos.honjin.y - py * 64 + ny * 32,
      defaultType: profile.preferredTurrets[1] || 'fire_tower',
    },
    {
      x: bPos.honjin.x + nx * 90,
      y: bPos.honjin.y + ny * 90,
      defaultType: profile.preferredTurrets[2] || 'cannon_battery',
    },
    {
      x: bPos.honjin.x + px * 36 - nx * 30,
      y: bPos.honjin.y + py * 36 - ny * 30,
      defaultType: profile.preferredTurrets[0] || 'arrow_tower',
    },
    {
      x: bPos.honjin.x - px * 36 - nx * 30,
      y: bPos.honjin.y - py * 36 - ny * 30,
      defaultType: profile.preferredTurrets[0] || 'arrow_tower',
    },
    {
      x: (bPos.maru1.x + bPos.honjin.x) / 2 + nx * 35,
      y: (bPos.maru1.y + bPos.honjin.y) / 2 + ny * 35,
      defaultType: profile.preferredTurrets[2] || 'catapult',
    },
    {
      x: (bPos.maru2.x + bPos.honjin.x) / 2 + nx * 35,
      y: (bPos.maru2.y + bPos.honjin.y) / 2 + ny * 35,
      defaultType: profile.preferredTurrets[2] || 'catapult',
    },
  ];

  for (const slot of turretSlots) {
    if (spentTurretBudget >= targetTurretBudget && budget < 250) break;
    const turretType = slot.defaultType;
    if (addTurret(slot.x, slot.y, turretType)) {
      spentTurretBudget += TURRET_DEFS[turretType].cost;
    }
  }

  // 4. Procedural Army Recruitment (ALL Remaining Budget Allocated Exhaustively)
  let soldierIdx = 0;
  let safetyAttempts = 0;

  // Keep hiring until budget cannot afford even the cheapest soldier (Samurai 75G)
  while (budget >= 75 && safetyAttempts < 350) {
    safetyAttempts++;

    // Find affordable soldier types among preferred, or fallback to any affordable
    const affordablePrefs = profile.soldierPref.filter(t => SOLDIER_DEFS[t].cost <= budget);
    let soldierType: SoldierType;

    if (affordablePrefs.length > 0) {
      soldierType = affordablePrefs[soldierIdx % affordablePrefs.length];
    } else {
      // Pick highest affordable soldier to consume budget efficiently
      if (budget >= 140) soldierType = 'cavalry';
      else if (budget >= 110) soldierType = 'sapper';
      else if (budget >= 85) soldierType = 'archer';
      else if (budget >= 75) soldierType = 'samurai';
      else break;
    }

    const def = SOLDIER_DEFS[soldierType];
    if (budget < def.cost) {
      if (budget < 75) break;
      continue;
    }

    // Determine formation spawn coordinates
    let spawnX = bPos.honjin.x + nx * 80;
    let spawnY = bPos.honjin.y + ny * 80;
    let stance = profile.defaultStance;

    const row = Math.floor(soldierIdx / 6);
    const col = (soldierIdx % 6) - 2.5;

    if (soldierType === 'cavalry') {
      // Cavalry on the flanks, aggressive vanguard
      const flankSign = (soldierIdx % 2 === 0 ? 1 : -1);
      spawnX = bPos.honjin.x + nx * (85 + row * 22) + px * (flankSign * (70 + Math.abs(col) * 16));
      spawnY = bPos.honjin.y + ny * (85 + row * 22) + py * (flankSign * (70 + Math.abs(col) * 16));
      stance = 'attack';
    } else if (soldierType === 'sapper') {
      // Sappers forward
      spawnX = bPos.honjin.x + nx * (65 + row * 18) + px * (col * 24);
      spawnY = bPos.honjin.y + ny * (65 + row * 18) + py * (col * 24);
      stance = 'attack';
    } else if (soldierType === 'archer') {
      // Archers entrenched near Maru and Honjin
      const baseAnchor = soldierIdx % 2 === 0 ? bPos.maru1 : bPos.maru2;
      spawnX = baseAnchor.x - nx * 10 + px * (col * 18);
      spawnY = baseAnchor.y - ny * 10 + py * (col * 18);
      stance = profile.defaultStance === 'attack' ? 'hybrid' : 'defense';
    } else {
      // Samurai core infantry formation
      const baseAnchor = soldierIdx % 3 === 0 ? bPos.maru1 : soldierIdx % 3 === 1 ? bPos.maru2 : bPos.honjin;
      spawnX = baseAnchor.x + nx * (35 + row * 16) + px * (col * 20);
      spawnY = baseAnchor.y + ny * (35 + row * 16) + py * (col * 20);
      stance = profile.defaultStance;
    }

    // Try placing at intended position, or fallback to random spot within build zone
    if (addSoldier(spawnX, spawnY, soldierType, stance)) {
      soldierIdx++;
    } else {
      // Scatter placement within valid zone
      const rx = bZone.minX + 25 + Math.random() * (bZone.maxX - bZone.minX - 50);
      const ry = bZone.minY + 25 + Math.random() * (bZone.maxY - bZone.minY - 50);
      if (addSoldier(rx, ry, soldierType, stance)) {
        soldierIdx++;
      }
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
  battleTime: number,
  enemyTeam: Team = 'enemy'
): EnemyTacticalCommand | null {
  const livingEnemySoldiers = soldiers.filter(s => s.team === enemyTeam && s.hp > 0);
  const livingOpponentSoldiers = soldiers.filter(s => s.team !== enemyTeam && s.hp > 0);
  if (livingEnemySoldiers.length === 0) return null;

  const enemyHonjin = structures.find(s => s.team === enemyTeam && s.objectiveType === 'honjin');
  const enemyMaruUnderAttack = structures.some(
    s => s.team === enemyTeam && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp < s.maxHp * 0.45 && s.hp > 0
  );
  const isHonjinUnderAttack = enemyHonjin && !enemyHonjin.isInvulnerable && enemyHonjin.hp < enemyHonjin.maxHp;

  // Invaders near this team's Honjin or Maru
  const nearbyInvaders = enemyHonjin
    ? livingOpponentSoldiers.filter(s => Math.hypot(s.x - enemyHonjin.x, s.y - enemyHonjin.y) < 320)
    : [];

  if ((nearbyInvaders.length >= 2 || isHonjinUnderAttack || enemyMaruUnderAttack) && currentEnemyStance !== 'defense') {
    const newStances = livingEnemySoldiers.map(soldier => {
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
  const playerMaruDestroyed = structures.filter(
    s => s.team === 'player' && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp <= 0
  ).length;

  const playerHonjinExposed = playerMaruDestroyed >= 2;
  const numericalAdvantage = livingEnemySoldiers.length >= livingOpponentSoldiers.length * 1.3 && nearbyInvaders.length === 0;

  if ((playerHonjinExposed || playerMaruDestroyed >= 1 || numericalAdvantage) && currentEnemyStance !== 'attack' && nearbyInvaders.length === 0) {
    const newStances = livingEnemySoldiers.map(soldier => ({
      id: soldier.id,
      stance: 'attack' as SoldierStance,
    }));

    return {
      newStances,
      overallStance: 'attack',
      bannerMessage: playerHonjinExposed
        ? '【敵将号令】「敵本陣の結界は崩れた！全軍、敵本陣へ総突撃せよ！」'
        : '【敵将号令】「好機到来！全軍突撃陣形へ移行！」',
    };
  }

  // 3. Condition: Midfield Stalemate / Flexible Guerrilla (HYBRID / 遊撃作戦)
  if (currentEnemyStance !== 'hybrid' && nearbyInvaders.length === 0 && !playerHonjinExposed) {
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
 */
export function evaluateEnemyTacticalBomb(
  soldiers: Soldier[],
  structures: Structure[],
  enemyHasBomb: boolean,
  enemyIsBombUsed: boolean,
  battleTimeSeconds: number,
  enemyTeam: Team = 'enemy'
): { targetX: number; targetY: number } | null {
  if (!enemyHasBomb || enemyIsBombUsed || battleTimeSeconds < 12) {
    return null;
  }

  const livingOpponentSoldiers = soldiers.filter(s => s.team !== enemyTeam && s.hp > 0);
  if (livingOpponentSoldiers.length === 0) return null;

  // 1. Check for clusters of opponents
  let bestCluster: { x: number; y: number; count: number } = { x: 0, y: 0, count: 0 };

  for (const s1 of livingOpponentSoldiers) {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (const s2 of livingOpponentSoldiers) {
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

  if (bestCluster.count >= 2) {
    return { targetX: bestCluster.x, targetY: bestCluster.y };
  }

  // 2. Check if opponents are attacking this team's objectives
  const threatenedObjectives = structures.filter(
    st => st.team === enemyTeam && st.isObjective && st.hp > 0
  );

  for (const obj of threatenedObjectives) {
    const attackers = livingOpponentSoldiers.filter(s => Math.hypot(s.x - obj.x, s.y - obj.y) <= 160);
    if (attackers.length >= 1) {
      const avgX = attackers.reduce((acc, a) => acc + a.x, 0) / attackers.length;
      const avgY = attackers.reduce((acc, a) => acc + a.y, 0) / attackers.length;
      return { targetX: avgX, targetY: avgY };
    }
  }

  // 3. Fallback: if battle > 35s, target a prominent opponent
  if (battleTimeSeconds > 35 && livingOpponentSoldiers.length > 0) {
    const leadSoldier = livingOpponentSoldiers[0];
    return { targetX: leadSoldier.x, targetY: leadSoldier.y };
  }

  return null;
}

/**
 * AI in-battle Reinforcements Evaluation
 */
export function evaluateEnemyReinforcements(
  enemyFunds: number,
  soldiers: Soldier[],
  structures: Structure[],
  currentTime: number,
  lastSpawnTime: number,
  enemyTeam: Team = 'enemy'
): { type: SoldierType; stance: SoldierStance; cost: number; message: string } | null {
  if (enemyFunds < 75 || currentTime - lastSpawnTime < 5.0) {
    return null;
  }

  const livingOpponents = soldiers.filter(s => s.team !== enemyTeam && s.hp > 0);
  const enemyHonjin = structures.find(s => s.team === enemyTeam && s.objectiveType === 'honjin');

  const invaders = enemyHonjin
    ? livingOpponents.filter(s => Math.hypot(s.x - enemyHonjin.x, s.y - enemyHonjin.y) < 280)
    : [];

  if (invaders.length > 0 && enemyFunds >= 75) {
    return {
      type: 'samurai',
      stance: 'defense',
      cost: 75,
      message: '【敵軍防衛増援】敵軍が本陣防衛の侍部隊を出撃！',
    };
  }

  if (enemyFunds >= 140) {
    return {
      type: 'cavalry',
      stance: 'attack',
      cost: 140,
      message: '【敵軍突撃増援】敵軍が好機と見て騎馬強襲部隊を出撃！',
    };
  }

  if (enemyFunds >= 110 && Math.random() < 0.5) {
    return {
      type: 'sapper',
      stance: 'attack',
      cost: 110,
      message: '【敵軍破城増援】敵軍が工兵部隊を出撃！',
    };
  }

  if (enemyFunds >= 85) {
    return {
      type: 'archer',
      stance: 'hybrid',
      cost: 85,
      message: '【敵軍援護増援】敵軍が弓兵部隊を出撃！',
    };
  }

  return null;
}
