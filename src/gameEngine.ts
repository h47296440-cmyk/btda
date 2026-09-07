import {
  Structure,
  Soldier,
  Projectile,
  DamageNumber,
  Particle,
  Team,
  SoldierStance,
  SoldierType,
  MaterialType,
  TurretType,
  GameStats,
  Winner,
  RespawnQueueItem,
  TacticalBomb,
} from './types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  STARTING_BUDGET,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  SOLDIER_RESPAWN_SECONDS,
  BATTLE_TIME_LIMIT,
  BOMB_CONFIG,
  KILL_BOUNTY_GOLD,
} from './gameConfig';
import { sounds } from './audio';

// Helper to create default objectives
export function createInitialObjectives(): Structure[] {
  return [
    // Player Honjin (Keep)
    {
      id: 'player_honjin',
      type: 'honjin',
      team: 'player',
      x: 100,
      y: FIELD_HEIGHT / 2,
      width: 80,
      height: 80,
      hp: 3800,
      maxHp: 3800,
      cost: 0,
      isObjective: true,
      objectiveType: 'honjin',
      isInvulnerable: true,
    },
    // Player Maru 1 (Ninomaru)
    {
      id: 'player_maru_1',
      type: 'maru_1',
      team: 'player',
      x: 310,
      y: 190,
      width: 64,
      height: 64,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_1',
      isInvulnerable: false,
    },
    // Player Maru 2 (Sannomaru)
    {
      id: 'player_maru_2',
      type: 'maru_2',
      team: 'player',
      x: 310,
      y: FIELD_HEIGHT - 190,
      width: 64,
      height: 64,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_2',
      isInvulnerable: false,
    },
    // Enemy Honjin
    {
      id: 'enemy_honjin',
      type: 'honjin',
      team: 'enemy',
      x: FIELD_WIDTH - 100,
      y: FIELD_HEIGHT / 2,
      width: 80,
      height: 80,
      hp: 3800,
      maxHp: 3800,
      cost: 0,
      isObjective: true,
      objectiveType: 'honjin',
      isInvulnerable: true,
    },
    // Enemy Maru 1
    {
      id: 'enemy_maru_1',
      type: 'maru_1',
      team: 'enemy',
      x: FIELD_WIDTH - 310,
      y: 190,
      width: 64,
      height: 64,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_1',
      isInvulnerable: false,
    },
    // Enemy Maru 2
    {
      id: 'enemy_maru_2',
      type: 'maru_2',
      team: 'enemy',
      x: FIELD_WIDTH - 310,
      y: FIELD_HEIGHT - 190,
      width: 64,
      height: 64,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_2',
      isInvulnerable: false,
    },
  ];
}

// Generate AI defenses and soldiers based on varied strategies
export function generateEnemySetup(strategyIndex: number = 0): { structures: Structure[]; soldiers: Soldier[] } {
  const structures: Structure[] = [];
  const soldiers: Soldier[] = [];
  let budget = STARTING_BUDGET;

  const strategies = ['fortress', 'assault', 'artillery'];
  const strategy = strategies[strategyIndex % strategies.length];

  const addWall = (x: number, y: number, type: MaterialType) => {
    const def = WALL_DEFS[type];
    if (budget < def.cost) return;
    budget -= def.cost;
    structures.push({
      id: 'enemy_wall_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      x,
      y,
      width: 36,
      height: 36,
      hp: def.hp!,
      maxHp: def.hp!,
      cost: def.cost,
      spikeDamage: type === 'spike_wall' ? 20 : 0,
    });
  };

  const addTurret = (x: number, y: number, type: TurretType) => {
    const def = TURRET_DEFS[type];
    if (budget < def.cost) return;
    budget -= def.cost;
    structures.push({
      id: 'enemy_turret_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      x,
      y,
      width: 44,
      height: 44,
      hp: def.hp!,
      maxHp: def.hp!,
      cost: def.cost,
      range: def.range!,
      attackPower: def.attack!,
      attackCooldown: type === 'fire_tower' ? 0.35 : type === 'arrow_tower' ? 1.0 : type === 'cannon_battery' ? 2.3 : 3.0,
      lastAttackTime: 0,
    });
  };

  const addSoldier = (x: number, y: number, type: SoldierType, stance: SoldierStance) => {
    const def = SOLDIER_DEFS[type];
    if (budget < def.cost) return;
    budget -= def.cost;
    soldiers.push({
      id: 'enemy_sol_' + Math.random().toString(36).substring(2, 9),
      type,
      team: 'enemy',
      stance,
      x,
      y,
      targetX: x,
      targetY: y,
      hp: def.hp!,
      maxHp: def.hp!,
      speed: def.speed!,
      attackPower: def.attack!,
      attackRange: type === 'archer' ? 190 : type === 'cavalry' ? 34 : 28,
      attackCooldown: type === 'samurai' ? 0.8 : type === 'archer' ? 1.2 : type === 'cavalry' ? 1.1 : 1.0,
      lastAttackTime: 0,
      targetId: null,
      targetType: null,
      siegeMultiplier: type === 'sapper' ? 3.5 : 1.0,
      cost: def.cost,
      kills: 0,
      facing: Math.PI, // Facing left toward player
    });
  };

  if (strategy === 'fortress') {
    // Heavy protective walls around Maru 1 and Maru 2
    for (let y = 130; y <= 250; y += 38) {
      addWall(920, y, 'stone_wall');
    }
    for (let y = FIELD_HEIGHT - 250; y <= FIELD_HEIGHT - 130; y += 38) {
      addWall(920, y, 'stone_wall');
    }
    // Honjin center defense
    addWall(1110, FIELD_HEIGHT / 2 - 40, 'iron_wall');
    addWall(1110, FIELD_HEIGHT / 2, 'iron_wall');
    addWall(1110, FIELD_HEIGHT / 2 + 40, 'iron_wall');

    // Turrets behind walls
    addTurret(970, 110, 'arrow_tower');
    addTurret(970, FIELD_HEIGHT - 110, 'arrow_tower');
    addTurret(1150, FIELD_HEIGHT / 2 - 80, 'catapult');
    addTurret(1150, FIELD_HEIGHT / 2 + 80, 'cannon_battery');

    // Soldiers
    addSoldier(950, 200, 'samurai', 'defense');
    addSoldier(950, FIELD_HEIGHT - 200, 'samurai', 'defense');
    addSoldier(1050, FIELD_HEIGHT / 2, 'archer', 'defense');
    addSoldier(880, 280, 'sapper', 'attack');
    addSoldier(880, 400, 'cavalry', 'attack');
    addSoldier(900, FIELD_HEIGHT / 2, 'archer', 'hybrid');
    addSoldier(920, 240, 'samurai', 'hybrid');
  } else if (strategy === 'assault') {
    // Spike & wood barricades, heavy assault army
    for (let y = 140; y <= 240; y += 45) {
      addWall(940, y, 'spike_wall');
    }
    for (let y = FIELD_HEIGHT - 240; y <= FIELD_HEIGHT - 140; y += 45) {
      addWall(940, y, 'spike_wall');
    }
    addTurret(980, FIELD_HEIGHT / 2, 'fire_tower');
    addTurret(1060, 130, 'arrow_tower');

    addSoldier(880, 150, 'cavalry', 'attack');
    addSoldier(880, 230, 'cavalry', 'attack');
    addSoldier(880, FIELD_HEIGHT - 150, 'cavalry', 'attack');
    addSoldier(880, FIELD_HEIGHT - 230, 'cavalry', 'attack');
    addSoldier(850, 300, 'sapper', 'attack');
    addSoldier(850, 380, 'sapper', 'attack');
    addSoldier(920, 190, 'archer', 'hybrid');
    addSoldier(920, FIELD_HEIGHT - 190, 'archer', 'hybrid');
    addSoldier(1020, 180, 'samurai', 'defense');
    addSoldier(1020, FIELD_HEIGHT - 180, 'samurai', 'defense');
  } else {
    // Artillery strategy
    for (let y = 120; y <= 260; y += 38) {
      addWall(930, y, 'stone_wall');
    }
    for (let y = FIELD_HEIGHT - 260; y <= FIELD_HEIGHT - 120; y += 38) {
      addWall(930, y, 'stone_wall');
    }
    addTurret(980, 120, 'cannon_battery');
    addTurret(980, FIELD_HEIGHT - 120, 'cannon_battery');
    addTurret(1140, FIELD_HEIGHT / 2, 'catapult');
    addTurret(1060, FIELD_HEIGHT / 2, 'arrow_tower');

    addSoldier(950, 200, 'samurai', 'defense');
    addSoldier(950, FIELD_HEIGHT - 200, 'samurai', 'defense');
    addSoldier(910, 270, 'archer', 'hybrid');
    addSoldier(910, 410, 'archer', 'hybrid');
    addSoldier(880, 340, 'sapper', 'attack');
    addSoldier(900, 230, 'cavalry', 'attack');
  }

  return { structures, soldiers };
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Update simulation step
export function updateGameStep(
  structures: Structure[],
  soldiers: Soldier[],
  projectiles: Projectile[],
  damageNumbers: DamageNumber[],
  particles: Particle[],
  respawnQueue: RespawnQueueItem[],
  tacticalBomb: TacticalBomb | null,
  stats: GameStats,
  deltaTime: number,
  currentTime: number,
  battleElapsedSeconds: number,
  onMaruFall?: (team: Team, maruType: string) => void,
  onHonjinExposed?: (team: Team) => void,
  onEnemyKilled?: (x: number, y: number, bounty: number) => void
): {
  structures: Structure[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  respawnQueue: RespawnQueueItem[];
  tacticalBomb: TacticalBomb | null;
  stats: GameStats;
  winner: Winner;
} {
  const newProjectiles = [...projectiles];
  const newDamageNumbers = [...damageNumbers];
  const newParticles = [...particles];
  const newRespawnQueue = [...respawnQueue];
  let currentBomb = tacticalBomb;

  const addDamageFloater = (x: number, y: number, dmg: number, color: string = '#ffffff', text?: string) => {
    newDamageNumbers.push({
      id: Math.random().toString(),
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
      damage: dmg,
      color,
      opacity: 1,
      scale: 1.2,
      text,
    });
  };

  const addExplosion = (x: number, y: number, color: string = '#f59e0b', count: number = 8, type: 'spark' | 'smoke' | 'debris' = 'spark') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      newParticles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        type,
      });
    }
  };

  // 1. Check Maru states and unlock Honjin if both Maru are destroyed
  const playerMaru1 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_1' && s.hp > 0);
  const playerMaru2 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_2' && s.hp > 0);
  const playerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');

  if (playerHonjin) {
    const wasInvuln = playerHonjin.isInvulnerable;
    playerHonjin.isInvulnerable = !!(playerMaru1 || playerMaru2);
    if (wasInvuln && !playerHonjin.isInvulnerable) {
      if (onHonjinExposed) onHonjinExposed('player');
      sounds.playWarHorn();
    }
  }

  const enemyMaru1 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_1' && s.hp > 0);
  const enemyMaru2 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_2' && s.hp > 0);
  const enemyHonjin = structures.find(s => s.team === 'enemy' && s.objectiveType === 'honjin');

  if (enemyHonjin) {
    const wasInvuln = enemyHonjin.isInvulnerable;
    enemyHonjin.isInvulnerable = !!(enemyMaru1 || enemyMaru2);
    if (wasInvuln && !enemyHonjin.isInvulnerable) {
      if (onHonjinExposed) onHonjinExposed('enemy');
      sounds.playWarHorn();
    }
  }

  // 2. Tactical Bomb Processing
  if (currentBomb && !currentBomb.exploded) {
    currentBomb.progress += 2.2 * deltaTime;
    currentBomb.currentY = currentBomb.startY + (currentBomb.targetY - currentBomb.startY) * Math.min(1, currentBomb.progress);

    // Smoke trail
    newParticles.push({
      id: Math.random().toString(),
      x: currentBomb.targetX + (Math.random() * 8 - 4),
      y: currentBomb.currentY,
      vx: 0,
      vy: -1,
      color: '#fbbf24',
      size: 4,
      life: 0.3,
      maxLife: 0.3,
      type: 'smoke',
    });

    if (currentBomb.progress >= 1) {
      currentBomb.exploded = true;
      sounds.playCannonBlast();
      // Giant explosion!
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#f97316', 24, 'smoke');
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#ef4444', 28, 'debris');
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#fbbf24', 20, 'spark');

      // Damage all enemy soldiers within radius
      for (const sol of soldiers) {
        if (sol.team === 'enemy' && sol.hp > 0 && dist(currentBomb.targetX, currentBomb.targetY, sol.x, sol.y) <= BOMB_CONFIG.radius) {
          sol.hp -= BOMB_CONFIG.damage;
          addDamageFloater(sol.x, sol.y, BOMB_CONFIG.damage, '#ef4444', '爆撃直撃');
        }
      }
      // Damage all enemy structures within radius
      for (const st of structures) {
        if (st.team === 'enemy' && st.hp > 0 && dist(currentBomb.targetX, currentBomb.targetY, st.x, st.y) <= BOMB_CONFIG.radius) {
          if (st.isInvulnerable) {
            sounds.playShieldDeflect();
            addDamageFloater(st.x, st.y, 0, '#60a5fa', '結界防御');
          } else {
            st.hp -= BOMB_CONFIG.damage;
            addDamageFloater(st.x, st.y, BOMB_CONFIG.damage, '#f59e0b', '爆撃破壊');
          }
        }
      }
      currentBomb = null;
    }
  }

  // 3. Soldier 15-Second Respawn Processing (やられた兵は15秒で復活)
  for (let i = newRespawnQueue.length - 1; i >= 0; i--) {
    const item = newRespawnQueue[i];
    if (currentTime >= item.respawnTime) {
      newRespawnQueue.splice(i, 1);
      const def = SOLDIER_DEFS[item.type];
      const isPlayer = item.team === 'player';
      const spawnX = isPlayer ? 120 + Math.random() * 60 : FIELD_WIDTH - 120 - Math.random() * 60;
      const spawnY = FIELD_HEIGHT / 2 + (Math.random() * 160 - 80);

      soldiers.push({
        id: `${item.team}_respawn_${Math.random().toString(36).substring(2, 8)}`,
        type: item.type,
        team: item.team,
        stance: item.stance,
        x: spawnX,
        y: spawnY,
        targetX: spawnX,
        targetY: spawnY,
        hp: def.hp!,
        maxHp: def.hp!,
        speed: def.speed!,
        attackPower: def.attack!,
        attackRange: item.type === 'archer' ? 190 : item.type === 'cavalry' ? 34 : 28,
        attackCooldown: item.type === 'samurai' ? 0.8 : item.type === 'archer' ? 1.2 : item.type === 'cavalry' ? 1.1 : 1.0,
        lastAttackTime: 0,
        targetId: null,
        targetType: null,
        siegeMultiplier: item.type === 'sapper' ? 3.5 : 1.0,
        cost: def.cost,
        kills: 0,
        facing: isPlayer ? 0 : Math.PI,
      });

      addExplosion(spawnX, spawnY, isPlayer ? '#3b82f6' : '#ef4444', 12, 'spark');
      addDamageFloater(spawnX, spawnY - 15, 0, isPlayer ? '#60a5fa' : '#f87171', '出撃復帰！');
    }
  }

  // 4. Turret Attacks
  for (const struct of structures) {
    if (struct.hp <= 0 || !struct.range || !struct.attackPower) continue;

    const cooldown = struct.attackCooldown || 1.5;
    if (currentTime - (struct.lastAttackTime || 0) < cooldown) continue;

    const enemyTeam = struct.team === 'player' ? 'enemy' : 'player';
    const targetSoldiers = soldiers.filter(s => s.team === enemyTeam && s.hp > 0 && dist(struct.x, struct.y, s.x, s.y) <= struct.range!);

    if (targetSoldiers.length > 0) {
      targetSoldiers.sort((a, b) => dist(struct.x, struct.y, a.x, a.y) - dist(struct.x, struct.y, b.x, b.y));
      const target = targetSoldiers[0];

      struct.lastAttackTime = currentTime;

      if (struct.type === 'arrow_tower') {
        sounds.playArrowShoot();
        newProjectiles.push({
          id: Math.random().toString(),
          sourceTeam: struct.team,
          x: struct.x,
          y: struct.y,
          startX: struct.x,
          startY: struct.y,
          targetX: target.x,
          targetY: target.y,
          progress: 0,
          speed: 4.5,
          damage: struct.attackPower,
          splashRadius: 0,
          type: 'arrow',
          arcHeight: 25,
        });
      } else if (struct.type === 'cannon_battery') {
        sounds.playCannonBlast();
        newProjectiles.push({
          id: Math.random().toString(),
          sourceTeam: struct.team,
          x: struct.x,
          y: struct.y,
          startX: struct.x,
          startY: struct.y,
          targetX: target.x,
          targetY: target.y,
          progress: 0,
          speed: 3.2,
          damage: struct.attackPower,
          splashRadius: 55,
          type: 'cannonball',
          arcHeight: 45,
        });
      } else if (struct.type === 'catapult') {
        sounds.playCannonBlast();
        newProjectiles.push({
          id: Math.random().toString(),
          sourceTeam: struct.team,
          x: struct.x,
          y: struct.y,
          startX: struct.x,
          startY: struct.y,
          targetX: target.x,
          targetY: target.y,
          progress: 0,
          speed: 2.8,
          damage: struct.attackPower,
          splashRadius: 40,
          type: 'boulder',
          arcHeight: 70,
        });
      } else if (struct.type === 'fire_tower') {
        target.hp -= struct.attackPower;
        addDamageFloater(target.x, target.y, struct.attackPower, '#f97316');
        addExplosion(target.x, target.y, '#f97316', 5, 'spark');
      }
    }
  }

  // 5. Update Projectiles
  for (let i = newProjectiles.length - 1; i >= 0; i--) {
    const p = newProjectiles[i];
    p.progress += p.speed * deltaTime;
    p.x = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);
    p.y = p.startY + (p.targetY - p.startY) * Math.min(1, p.progress);

    if (p.progress >= 1) {
      newProjectiles.splice(i, 1);
      const enemyTeam = p.sourceTeam === 'player' ? 'enemy' : 'player';

      if (p.splashRadius > 0) {
        addExplosion(p.targetX, p.targetY, '#ef4444', 16, 'smoke');
        addExplosion(p.targetX, p.targetY, '#fbbf24', 10, 'spark');
        sounds.playCannonBlast();

        for (const sol of soldiers) {
          if (sol.team === enemyTeam && sol.hp > 0 && dist(p.targetX, p.targetY, sol.x, sol.y) <= p.splashRadius) {
            sol.hp -= p.damage;
            addDamageFloater(sol.x, sol.y, p.damage, '#ef4444');
          }
        }
        for (const st of structures) {
          if (st.team === enemyTeam && st.hp > 0 && dist(p.targetX, p.targetY, st.x, st.y) <= p.splashRadius) {
            if (st.isInvulnerable) {
              sounds.playShieldDeflect();
              addDamageFloater(st.x, st.y, 0, '#60a5fa', '結界防御');
            } else {
              st.hp -= Math.floor(p.damage * 0.7);
              addDamageFloater(st.x, st.y, Math.floor(p.damage * 0.7), '#f59e0b');
            }
          }
        }
      } else {
        addExplosion(p.targetX, p.targetY, '#94a3b8', 4, 'spark');
        let hit = false;
        for (const sol of soldiers) {
          if (sol.team === enemyTeam && sol.hp > 0 && dist(p.targetX, p.targetY, sol.x, sol.y) <= 24) {
            sol.hp -= p.damage;
            addDamageFloater(sol.x, sol.y, p.damage, '#f87171');
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const st of structures) {
            if (st.team === enemyTeam && st.hp > 0 && dist(p.targetX, p.targetY, st.x, st.y) <= 30) {
              if (st.isInvulnerable) {
                sounds.playShieldDeflect();
                addDamageFloater(st.x, st.y, 0, '#60a5fa', '結界防御');
              } else {
                st.hp -= p.damage;
                addDamageFloater(st.x, st.y, p.damage, '#f59e0b');
              }
              break;
            }
          }
        }
      }
    }
  }

  // 6. Update Soldiers (Movement & Stances)
  // Soft friendly soldier crowd separation (prevents clogging at choke points)
  for (let a = 0; a < soldiers.length; a++) {
    const s1 = soldiers[a];
    if (s1.hp <= 0) continue;
    for (let b = a + 1; b < soldiers.length; b++) {
      const s2 = soldiers[b];
      if (s2.hp <= 0 || s1.team !== s2.team) continue;
      const d = dist(s1.x, s1.y, s2.x, s2.y);
      if (d < 16 && d > 0.001) {
        const push = (16 - d) * 0.12;
        const nx = (s1.x - s2.x) / d;
        const ny = (s1.y - s2.y) / d;
        s1.x += nx * push;
        s1.y += ny * push;
        s2.x -= nx * push;
        s2.y -= ny * push;
      }
    }
  }

  for (const soldier of soldiers) {
    if (soldier.hp <= 0) continue;

    // Gentle separation push if soldier actually overlaps inside friendly structure (ignoring friendly walls so troops never get pushed back)
    for (const st of structures) {
      if (st.hp > 0 && st.team === soldier.team && !st.type.includes('wall')) {
        const halfW = st.width / 2 + 4;
        const halfH = st.height / 2 + 4;
        const dx = soldier.x - st.x;
        const dy = soldier.y - st.y;
        if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
          const overlapX = halfW - Math.abs(dx);
          const overlapY = halfH - Math.abs(dy);
          if (overlapX < overlapY) {
            soldier.x += (dx >= 0 ? 1 : -1) * Math.min(overlapX, 2.5);
          } else {
            soldier.y += (dy >= 0 ? 1 : -1) * Math.min(overlapY, 2.5);
          }
        }
      }
    }

    const enemyTeam = soldier.team === 'player' ? 'enemy' : 'player';
    const isPlayer = soldier.team === 'player';

    let targetEntity: { x: number; y: number; id: string; type: 'soldier' | 'structure'; hp: number; isInvulnerable?: boolean } | null = null;

    const nearbyEnemySoldiers = soldiers.filter(
      s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= soldier.attackRange + 15
    );

    if (nearbyEnemySoldiers.length > 0) {
      nearbyEnemySoldiers.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
      targetEntity = {
        x: nearbyEnemySoldiers[0].x,
        y: nearbyEnemySoldiers[0].y,
        id: nearbyEnemySoldiers[0].id,
        type: 'soldier',
        hp: nearbyEnemySoldiers[0].hp,
      };
    } else {
      if (soldier.stance === 'attack') {
        const enemyActiveMaru = structures.filter(
          s => s.team === enemyTeam && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp > 0
        );

        let primaryObjective: Structure | undefined;
        if (enemyActiveMaru.length > 0) {
          enemyActiveMaru.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          primaryObjective = enemyActiveMaru[0];
        } else {
          primaryObjective = structures.find(s => s.team === enemyTeam && s.objectiveType === 'honjin' && s.hp > 0);
        }

        const blockingStructures = structures.filter(
          s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 80
        );

        if (blockingStructures.length > 0) {
          blockingStructures.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          const targetStr = blockingStructures[0];
          targetEntity = {
            x: targetStr.x,
            y: targetStr.y,
            id: targetStr.id,
            type: 'structure',
            hp: targetStr.hp,
            isInvulnerable: targetStr.isInvulnerable,
          };
        } else if (primaryObjective) {
          targetEntity = {
            x: primaryObjective.x,
            y: primaryObjective.y,
            id: primaryObjective.id,
            type: 'structure',
            hp: primaryObjective.hp,
            isInvulnerable: primaryObjective.isInvulnerable,
          };
        }
      } else if (soldier.stance === 'defense') {
        const homeBoundaryX = isPlayer ? 620 : FIELD_WIDTH - 620;
        const invadingEnemies = soldiers.filter(
          s => s.team === enemyTeam && s.hp > 0 && (isPlayer ? s.x <= homeBoundaryX : s.x >= homeBoundaryX)
        );

        if (invadingEnemies.length > 0) {
          invadingEnemies.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          targetEntity = {
            x: invadingEnemies[0].x,
            y: invadingEnemies[0].y,
            id: invadingEnemies[0].id,
            type: 'soldier',
            hp: invadingEnemies[0].hp,
          };
        } else {
          const anchorX = isPlayer ? 260 : FIELD_WIDTH - 260;
          const anchorY = soldier.y < FIELD_HEIGHT / 2 ? 220 : FIELD_HEIGHT - 220;
          targetEntity = {
            x: anchorX,
            y: anchorY,
            id: 'patrol',
            type: 'structure',
            hp: 9999,
          };
        }
      } else {
        // Hybrid stance
        const nearbyEnemies = soldiers.filter(
          s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 260
        );

        if (nearbyEnemies.length > 0) {
          nearbyEnemies.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          targetEntity = {
            x: nearbyEnemies[0].x,
            y: nearbyEnemies[0].y,
            id: nearbyEnemies[0].id,
            type: 'soldier',
            hp: nearbyEnemies[0].hp,
          };
        } else {
          const midLineX = FIELD_WIDTH / 2 + (isPlayer ? 90 : -90);
          if ((isPlayer && soldier.x < midLineX) || (!isPlayer && soldier.x > midLineX)) {
            targetEntity = {
              x: midLineX,
              y: soldier.y,
              id: 'midline',
              type: 'structure',
              hp: 9999,
            };
          } else {
            const activeMaru = structures.filter(
              s => s.team === enemyTeam && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp > 0
            );
            if (activeMaru.length > 0) {
              activeMaru.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
              targetEntity = {
                x: activeMaru[0].x,
                y: activeMaru[0].y,
                id: activeMaru[0].id,
                type: 'structure',
                hp: activeMaru[0].hp,
                isInvulnerable: activeMaru[0].isInvulnerable,
              };
            } else {
              const enemyHon = structures.find(s => s.team === enemyTeam && s.objectiveType === 'honjin' && s.hp > 0);
              if (enemyHon) {
                targetEntity = {
                  x: enemyHon.x,
                  y: enemyHon.y,
                  id: enemyHon.id,
                  type: 'structure',
                  hp: enemyHon.hp,
                  isInvulnerable: enemyHon.isInvulnerable,
                };
              }
            }
          }
        }
      }
    }

    if (targetEntity) {
      const d = dist(soldier.x, soldier.y, targetEntity.x, targetEntity.y);
      const angle = Math.atan2(targetEntity.y - soldier.y, targetEntity.x - soldier.x);
      soldier.facing = angle;

      if (d <= soldier.attackRange && targetEntity.id !== 'patrol' && targetEntity.id !== 'midline') {
        soldier.isAttacking = true;
        if (currentTime - soldier.lastAttackTime >= soldier.attackCooldown) {
          soldier.lastAttackTime = currentTime;

          let damage = soldier.attackPower;
          if (targetEntity.type === 'structure') {
            damage = Math.floor(damage * soldier.siegeMultiplier);
          }

          if (soldier.type === 'archer') {
            sounds.playArrowShoot();
            newProjectiles.push({
              id: Math.random().toString(),
              sourceTeam: soldier.team,
              x: soldier.x,
              y: soldier.y,
              startX: soldier.x,
              startY: soldier.y,
              targetX: targetEntity.x,
              targetY: targetEntity.y,
              progress: 0,
              speed: 5.0,
              damage,
              splashRadius: 0,
              type: 'arrow',
              arcHeight: 20,
            });
          } else {
            sounds.playSwordSlash();
            addExplosion(targetEntity.x, targetEntity.y, '#e2e8f0', 4, 'spark');

            if (targetEntity.type === 'soldier') {
              const targetSol = soldiers.find(s => s.id === targetEntity!.id);
              if (targetSol) {
                targetSol.hp -= damage;
                addDamageFloater(targetSol.x, targetSol.y, damage, isPlayer ? '#60a5fa' : '#f87171');
                if (targetSol.hp <= 0) soldier.kills++;
              }
            } else {
              const targetStr = structures.find(s => s.id === targetEntity!.id);
              if (targetStr) {
                if (targetStr.isInvulnerable) {
                  sounds.playShieldDeflect();
                  addDamageFloater(targetStr.x, targetStr.y, 0, '#60a5fa', '結界無効');
                } else {
                  targetStr.hp -= damage;
                  addDamageFloater(targetStr.x, targetStr.y, damage, '#f59e0b');

                  if (targetStr.spikeDamage && targetStr.spikeDamage > 0) {
                    soldier.hp -= targetStr.spikeDamage;
                    addDamageFloater(soldier.x, soldier.y, targetStr.spikeDamage, '#ef4444', '反撃');
                  }
                }
              }
            }
          }
        }
      } else {
        soldier.isAttacking = false;
        const moveSpeed = soldier.speed * 60 * deltaTime;
        const baseAngle = Math.atan2(targetEntity.y - soldier.y, targetEntity.x - soldier.x);

        // Helper to check if a position collides with boundary or any blocking structure
        const getObstacleAt = (
          px: number,
          py: number,
          targetId?: string | null
        ): Structure | 'boundary' | null => {
          if (px < 18 || px > FIELD_WIDTH - 18 || py < 25 || py > FIELD_HEIGHT - 25) {
            return 'boundary';
          }
          for (const st of structures) {
            if (st.hp <= 0 || st.id === targetId) continue;
            // FRIENDLY WALLS: Act as castle gates/narrow passages for friendly troops so they never get trapped!
            if (st.team === soldier.team && st.type.includes('wall')) {
              continue;
            }
            // ENEMY WALLS: Block opposing soldiers (they must attack/destroy or detour around them)
            if (st.team !== soldier.team && st.type.includes('wall')) {
              const hw = st.width / 2 + 2;
              const hh = st.height / 2 + 2;
              if (Math.abs(px - st.x) < hw && Math.abs(py - st.y) < hh) {
                return st;
              }
            }
            // BUILDINGS & TURRETS: Solid obstacles to navigate around
            if (!st.type.includes('wall')) {
              if (st.id === targetId) continue;
              const hw = st.width / 2 + 2;
              const hh = st.height / 2 + 2;
              if (Math.abs(px - st.x) < hw && Math.abs(py - st.y) < hh) {
                return st;
              }
            }
          }
          return null;
        };

        // 1. Check direct path
        const directStepX = soldier.x + Math.cos(baseAngle) * moveSpeed;
        const directStepY = soldier.y + Math.sin(baseAngle) * moveSpeed;
        const obsStep = getObstacleAt(directStepX, directStepY, targetEntity.id);

        if (!obsStep) {
          // Direct step is clear!
          soldier.avoidDir = undefined;
          soldier.stuckTimer = 0;
          soldier.facing = baseAngle;
          soldier.x = Math.max(20, Math.min(FIELD_WIDTH - 20, directStepX));
          soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, directStepY));
        } else {
          // Direct step is blocked by an obstacle (enemy wall or core building)
          if (obsStep !== 'boundary' && obsStep.team === enemyTeam && obsStep.type.includes('wall')) {
            // Attack enemy wall if in attack stance or sapper
            if (soldier.type === 'sapper' || soldier.stance === 'attack') {
              if (currentTime - soldier.lastAttackTime >= soldier.attackCooldown) {
                soldier.lastAttackTime = currentTime;
                const dmg = Math.floor(soldier.attackPower * soldier.siegeMultiplier);
                obsStep.hp -= dmg;
                sounds.playSwordSlash();
                addDamageFloater(obsStep.x, obsStep.y, dmg, '#fbbf24', '壁破壊');
              }
            }
          }

          // Smart Tangent Wall-Sliding & Detour Navigation
          let moved = false;
          const diffX = targetEntity.x - soldier.x;
          const diffY = targetEntity.y - soldier.y;

          // Helper to try vertical slide (along Y)
          const trySlideY = (): boolean => {
            const prefSignY = diffY >= 0 ? 1 : -1;
            const candY = soldier.y + prefSignY * moveSpeed;
            if (!getObstacleAt(soldier.x, candY, targetEntity.id)) {
              soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, candY));
              soldier.facing = prefSignY > 0 ? Math.PI / 2 : -Math.PI / 2;
              return true;
            }
            // Try opposite direction along Y
            const altY = soldier.y - prefSignY * moveSpeed;
            if (!getObstacleAt(soldier.x, altY, targetEntity.id)) {
              soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, altY));
              soldier.facing = prefSignY > 0 ? -Math.PI / 2 : Math.PI / 2;
              return true;
            }
            return false;
          };

          // Helper to try horizontal slide (along X)
          const trySlideX = (): boolean => {
            const prefSignX = diffX >= 0 ? 1 : -1;
            const candX = soldier.x + prefSignX * moveSpeed;
            if (!getObstacleAt(candX, soldier.y, targetEntity.id)) {
              soldier.x = Math.max(20, Math.min(FIELD_WIDTH - 20, candX));
              soldier.facing = prefSignX > 0 ? 0 : Math.PI;
              return true;
            }
            // Try opposite direction along X
            const altX = soldier.x - prefSignX * moveSpeed;
            if (!getObstacleAt(altX, soldier.y, targetEntity.id)) {
              soldier.x = Math.max(20, Math.min(FIELD_WIDTH - 20, altX));
              soldier.facing = prefSignX > 0 ? Math.PI : 0;
              return true;
            }
            return false;
          };

          // If predominantly moving horizontally, slide vertically first to bypass the wall
          if (Math.abs(diffX) >= Math.abs(diffY)) {
            moved = trySlideY() || trySlideX();
          } else {
            moved = trySlideX() || trySlideY();
          }

          if (!moved) {
            // Detour angle scan as secondary fallback
            const candidateAngles = [
              baseAngle + (60 * Math.PI) / 180,
              baseAngle - (60 * Math.PI) / 180,
              baseAngle + (100 * Math.PI) / 180,
              baseAngle - (100 * Math.PI) / 180,
            ];
            for (const ang of candidateAngles) {
              const cx = soldier.x + Math.cos(ang) * moveSpeed;
              const cy = soldier.y + Math.sin(ang) * moveSpeed;
              if (!getObstacleAt(cx, cy, targetEntity.id)) {
                soldier.facing = ang;
                soldier.x = Math.max(20, Math.min(FIELD_WIDTH - 20, cx));
                soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, cy));
                moved = true;
                break;
              }
            }
          }

          if (moved) {
            soldier.stuckTimer = 0;
          } else {
            soldier.stuckTimer = (soldier.stuckTimer || 0) + deltaTime;
            // Deadlock breaker: small lateral nudge if pinched
            if (soldier.stuckTimer > 0.25) {
              const nudgeSign = (soldier.id.charCodeAt(0) % 2 === 0 ? 1 : -1);
              soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, soldier.y + nudgeSign * 2));
              soldier.stuckTimer = 0;
            }
          }
        }
      }
    }
  }

  // 7. Structure Destruction Events
  for (let i = structures.length - 1; i >= 0; i--) {
    const st = structures[i];
    if (st.hp <= 0) {
      sounds.playWallBreak();
      addExplosion(st.x, st.y, '#78716c', 16, 'debris');
      addExplosion(st.x, st.y, '#ef4444', 10, 'spark');

      if (st.type.includes('wall')) {
        if (st.team === 'enemy') stats.wallsDestroyedByPlayer++;
        else stats.wallsDestroyedByEnemy++;
      }

      if (st.objectiveType === 'maru_1' || st.objectiveType === 'maru_2') {
        if (onMaruFall) onMaruFall(st.team, st.objectiveType === 'maru_1' ? '二の丸' : '三の丸');
      }

      if (!st.isObjective) {
        structures.splice(i, 1);
      }
    }
  }

  // 8. Clean up dead soldiers & Queue for 15-second respawn + Give Player Gold
  for (let i = soldiers.length - 1; i >= 0; i--) {
    const s = soldiers[i];
    if (s.hp <= 0) {
      addExplosion(s.x, s.y, '#991b1b', 8, 'smoke');

      if (s.team === 'enemy') {
        stats.soldiersKilledByPlayer++;
        // Award Player Gold bounty! (相手の兵を倒すと予算もらえるように)
        if (onEnemyKilled) {
          onEnemyKilled(s.x, s.y, KILL_BOUNTY_GOLD);
        }
        addDamageFloater(s.x, s.y - 12, KILL_BOUNTY_GOLD, '#facc15', '+金');
      } else {
        stats.soldiersKilledByEnemy++;
      }

      // Queue for 15-Second Respawn (やられた兵は15秒で復活)
      newRespawnQueue.push({
        id: Math.random().toString(),
        type: s.type,
        team: s.team,
        stance: s.stance,
        respawnTime: currentTime + SOLDIER_RESPAWN_SECONDS,
      });

      soldiers.splice(i, 1);
    }
  }

  // 9. Update Particles
  for (let i = newParticles.length - 1; i >= 0; i--) {
    const p = newParticles[i];
    p.life -= deltaTime;
    p.x += p.vx;
    p.y += p.vy;
    if (p.life <= 0) {
      newParticles.splice(i, 1);
    }
  }

  // 10. Update Damage Float Numbers
  for (let i = newDamageNumbers.length - 1; i >= 0; i--) {
    const d = newDamageNumbers[i];
    d.y -= 25 * deltaTime;
    d.opacity -= 1.2 * deltaTime;
    if (d.opacity <= 0) {
      newDamageNumbers.splice(i, 1);
    }
  }

  // 11. Win / Defeat condition
  let winner: Winner = null;
  const currentEnemyHonjin = structures.find(s => s.team === 'enemy' && s.objectiveType === 'honjin');
  const currentPlayerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');

  if (currentEnemyHonjin && currentEnemyHonjin.hp <= 0) {
    winner = 'player';
    stats.endReason = 'honjin_destroyed';
  } else if (currentPlayerHonjin && currentPlayerHonjin.hp <= 0) {
    winner = 'enemy';
    stats.endReason = 'honjin_destroyed';
  } else if (battleElapsedSeconds >= BATTLE_TIME_LIMIT) {
    // 3分経っても決着つかない場合はその時点でそれぞれの軍の3の丸2の丸本陣の体力を合計して多い方が勝ち(どちらも同じならひきわけ)
    const pMaru1 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_1');
    const pMaru2 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_2');
    const playerTotalHp =
      Math.max(0, currentPlayerHonjin?.hp || 0) +
      Math.max(0, pMaru1?.hp || 0) +
      Math.max(0, pMaru2?.hp || 0);

    const eMaru1 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_1');
    const eMaru2 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_2');
    const enemyTotalHp =
      Math.max(0, currentEnemyHonjin?.hp || 0) +
      Math.max(0, eMaru1?.hp || 0) +
      Math.max(0, eMaru2?.hp || 0);

    stats.playerTotalHp = playerTotalHp;
    stats.enemyTotalHp = enemyTotalHp;
    stats.endReason = 'time_limit';

    if (playerTotalHp > enemyTotalHp) {
      winner = 'player';
    } else if (enemyTotalHp > playerTotalHp) {
      winner = 'enemy';
    } else {
      winner = 'draw';
    }
  }

  return {
    structures,
    soldiers,
    projectiles: newProjectiles,
    damageNumbers: newDamageNumbers,
    particles: newParticles,
    respawnQueue: newRespawnQueue,
    tacticalBomb: currentBomb,
    stats,
    winner,
  };
}
