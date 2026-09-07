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
} from './types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  ENEMY_BUILD_ZONE,
  STARTING_BUDGET,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
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
      width: 76,
      height: 76,
      hp: 3600,
      maxHp: 3600,
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
      x: 290,
      y: 180,
      width: 60,
      height: 60,
      hp: 1600,
      maxHp: 1600,
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
      x: 290,
      y: FIELD_HEIGHT - 180,
      width: 60,
      height: 60,
      hp: 1600,
      maxHp: 1600,
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
      width: 76,
      height: 76,
      hp: 3600,
      maxHp: 3600,
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
      x: FIELD_WIDTH - 290,
      y: 180,
      width: 60,
      height: 60,
      hp: 1600,
      maxHp: 1600,
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
      x: FIELD_WIDTH - 290,
      y: FIELD_HEIGHT - 180,
      width: 60,
      height: 60,
      hp: 1600,
      maxHp: 1600,
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

  // Helper to add wall
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

  // Helper to add turret
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

  // Helper to add soldier
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
    // Front walls in front of Maru 1
    for (let y = 130; y <= 240; y += 38) {
      addWall(840, y, 'stone_wall');
    }
    // Front walls in front of Maru 2
    for (let y = FIELD_HEIGHT - 240; y <= FIELD_HEIGHT - 130; y += 38) {
      addWall(840, y, 'stone_wall');
    }
    // Honjin center defense
    addWall(1020, FIELD_HEIGHT / 2 - 40, 'iron_wall');
    addWall(1020, FIELD_HEIGHT / 2, 'iron_wall');
    addWall(1020, FIELD_HEIGHT / 2 + 40, 'iron_wall');

    // Turrets behind walls
    addTurret(890, 110, 'arrow_tower');
    addTurret(890, FIELD_HEIGHT - 110, 'arrow_tower');
    addTurret(1060, FIELD_HEIGHT / 2 - 80, 'catapult');

    // Soldiers: 3 defenders, 2 attack, 2 hybrid
    addSoldier(870, 200, 'samurai', 'defense');
    addSoldier(870, FIELD_HEIGHT - 200, 'samurai', 'defense');
    addSoldier(950, FIELD_HEIGHT / 2, 'archer', 'defense');
    addSoldier(800, 280, 'sapper', 'attack');
    addSoldier(800, 360, 'cavalry', 'attack');
    addSoldier(820, FIELD_HEIGHT / 2, 'archer', 'hybrid');
  } else if (strategy === 'assault') {
    // Spike & wood barricades, heavy spending on attacking army
    for (let y = 140; y <= 230; y += 45) {
      addWall(860, y, 'spike_wall');
    }
    for (let y = FIELD_HEIGHT - 230; y <= FIELD_HEIGHT - 140; y += 45) {
      addWall(860, y, 'spike_wall');
    }
    addTurret(890, FIELD_HEIGHT / 2, 'fire_tower');

    // 4 Cavalry Attack, 3 Sappers Attack, 2 Archer Hybrid, 2 Samurai Defense
    addSoldier(820, 150, 'cavalry', 'attack');
    addSoldier(820, 230, 'cavalry', 'attack');
    addSoldier(820, FIELD_HEIGHT - 150, 'cavalry', 'attack');
    addSoldier(820, FIELD_HEIGHT - 230, 'cavalry', 'attack');
    addSoldier(800, 300, 'sapper', 'attack');
    addSoldier(800, 350, 'sapper', 'attack');
    addSoldier(850, 190, 'archer', 'hybrid');
    addSoldier(850, FIELD_HEIGHT - 190, 'archer', 'hybrid');
    addSoldier(930, 180, 'samurai', 'defense');
    addSoldier(930, FIELD_HEIGHT - 180, 'samurai', 'defense');
  } else {
    // Artillery strategy: Cannon batteries, sturdy walls, heavy archers
    for (let y = 120; y <= 250; y += 38) {
      addWall(850, y, 'stone_wall');
    }
    for (let y = FIELD_HEIGHT - 250; y <= FIELD_HEIGHT - 120; y += 38) {
      addWall(850, y, 'stone_wall');
    }
    addTurret(900, 120, 'cannon_battery');
    addTurret(900, FIELD_HEIGHT - 120, 'cannon_battery');
    addTurret(1040, FIELD_HEIGHT / 2, 'arrow_tower');

    addSoldier(860, 200, 'samurai', 'defense');
    addSoldier(860, FIELD_HEIGHT - 200, 'samurai', 'defense');
    addSoldier(830, 270, 'archer', 'hybrid');
    addSoldier(830, 380, 'archer', 'hybrid');
    addSoldier(800, 320, 'sapper', 'attack');
  }

  return { structures, soldiers };
}

// Distance helper
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
  stats: GameStats,
  deltaTime: number,
  currentTime: number,
  onMaruFall?: (team: Team, maruType: string) => void,
  onHonjinExposed?: (team: Team) => void
): {
  structures: Structure[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  stats: GameStats;
  winner: Team | null;
} {
  const newProjectiles = [...projectiles];
  const newDamageNumbers = [...damageNumbers];
  const newParticles = [...particles];

  // Helper for damage floater
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

  // Helper for particle explosion
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
    // Honjin is invulnerable while at least one Maru is still alive
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

  // 2. Turret Attacks
  for (const struct of structures) {
    if (struct.hp <= 0 || !struct.range || !struct.attackPower) continue;

    const cooldown = struct.attackCooldown || 1.5;
    if (currentTime - (struct.lastAttackTime || 0) < cooldown) continue;

    // Find enemies in range (soldier or opposing structure)
    const enemyTeam = struct.team === 'player' ? 'enemy' : 'player';
    const targetSoldiers = soldiers.filter(s => s.team === enemyTeam && s.hp > 0 && dist(struct.x, struct.y, s.x, s.y) <= struct.range!);

    if (targetSoldiers.length > 0) {
      // Pick closest soldier
      targetSoldiers.sort((a, b) => dist(struct.x, struct.y, a.x, a.y) - dist(struct.x, struct.y, b.x, b.y));
      const target = targetSoldiers[0];

      struct.lastAttackTime = currentTime;

      // Create projectile
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
        // Direct flame spray
        target.hp -= struct.attackPower;
        addDamageFloater(target.x, target.y, struct.attackPower, '#f97316');
        addExplosion(target.x, target.y, '#f97316', 5, 'spark');
      }
    }
  }

  // 3. Update Projectiles
  for (let i = newProjectiles.length - 1; i >= 0; i--) {
    const p = newProjectiles[i];
    p.progress += p.speed * deltaTime;

    // Current position along trajectory
    p.x = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);
    p.y = p.startY + (p.targetY - p.startY) * Math.min(1, p.progress);

    if (p.progress >= 1) {
      // Impact!
      newProjectiles.splice(i, 1);
      const enemyTeam = p.sourceTeam === 'player' ? 'enemy' : 'player';

      if (p.splashRadius > 0) {
        // Area damage to soldiers and structures
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
        // Single target impact
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

  // 4. Update Soldiers (Movement, Stances, and Automatic Combat)
  for (const soldier of soldiers) {
    if (soldier.hp <= 0) continue;

    const enemyTeam = soldier.team === 'player' ? 'enemy' : 'player';
    const isPlayer = soldier.team === 'player';

    // Target selection based on stance
    let targetEntity: { x: number; y: number; id: string; type: 'soldier' | 'structure'; hp: number; isInvulnerable?: boolean } | null = null;

    // Check if any enemy soldiers are in immediate attack range
    const nearbyEnemySoldiers = soldiers.filter(
      s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= soldier.attackRange + 15
    );

    if (nearbyEnemySoldiers.length > 0) {
      // Prioritize self-defense against attacking enemy
      nearbyEnemySoldiers.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
      targetEntity = {
        x: nearbyEnemySoldiers[0].x,
        y: nearbyEnemySoldiers[0].y,
        id: nearbyEnemySoldiers[0].id,
        type: 'soldier',
        hp: nearbyEnemySoldiers[0].hp,
      };
    } else {
      // Find objective or strategic target depending on stance
      if (soldier.stance === 'attack') {
        // Attack Stance: Focus on breaking into enemy castle!
        // 1. Check if enemy Maru 1 or Maru 2 are alive
        const enemyActiveMaru = structures.filter(
          s => s.team === enemyTeam && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp > 0
        );

        let primaryObjective: Structure | undefined;
        if (enemyActiveMaru.length > 0) {
          // Attack closest active Maru
          enemyActiveMaru.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          primaryObjective = enemyActiveMaru[0];
        } else {
          // Both Maru down -> Target Honjin!
          primaryObjective = structures.find(s => s.team === enemyTeam && s.objectiveType === 'honjin' && s.hp > 0);
        }

        // Check if any enemy walls or turrets are blocking the way directly ahead
        const blockingStructures = structures.filter(
          s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 80
        );

        if (blockingStructures.length > 0) {
          // Demolish blocking wall/turret!
          blockingStructures.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          const targetStruct = blockingStructures[0];
          targetEntity = {
            x: targetStruct.x,
            y: targetStruct.y,
            id: targetStruct.id,
            type: 'structure',
            hp: targetStruct.hp,
            isInvulnerable: targetStruct.isInvulnerable,
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
        // Defense Stance: Protect friendly base and intercept any invader within home territory
        const homeBoundaryX = isPlayer ? 560 : FIELD_WIDTH - 560;
        const invadingEnemies = soldiers.filter(
          s => s.team === enemyTeam && s.hp > 0 && (isPlayer ? s.x <= homeBoundaryX : s.x >= homeBoundaryX)
        );

        if (invadingEnemies.length > 0) {
          // Intercept closest invader
          invadingEnemies.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          targetEntity = {
            x: invadingEnemies[0].x,
            y: invadingEnemies[0].y,
            id: invadingEnemies[0].id,
            type: 'soldier',
            hp: invadingEnemies[0].hp,
          };
        } else {
          // Patrol around friendly Maru or Honjin
          const anchorX = isPlayer ? 240 : FIELD_WIDTH - 240;
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
        // Hybrid Stance (遊撃):
        // First look for any enemy unit within detection radius (240px)
        const nearbyEnemies = soldiers.filter(
          s => s.team === enemyTeam && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 240
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
          // Push forward towards frontline / enemy structure
          const midLineX = FIELD_WIDTH / 2 + (isPlayer ? 80 : -80);
          if ((isPlayer && soldier.x < midLineX) || (!isPlayer && soldier.x > midLineX)) {
            targetEntity = {
              x: midLineX,
              y: soldier.y,
              id: 'midline',
              type: 'structure',
              hp: 9999,
            };
          } else {
            // Forward past midline -> attack enemy structures
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

    // Execute Soldier Movement or Attack
    if (targetEntity) {
      const d = dist(soldier.x, soldier.y, targetEntity.x, targetEntity.y);
      const angle = Math.atan2(targetEntity.y - soldier.y, targetEntity.x - soldier.x);
      soldier.facing = angle;

      const effectiveRange = soldier.attackRange;

      if (d <= effectiveRange && targetEntity.id !== 'patrol' && targetEntity.id !== 'midline') {
        // IN ATTACK RANGE: ATTACK!
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
            // Melee slash / strike
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

                  // If attacking a spike wall, reflect spike damage back to melee soldier
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
        // MOVE TOWARDS TARGET
        soldier.isAttacking = false;
        const moveSpeed = soldier.speed * 60 * deltaTime;
        const vx = Math.cos(angle) * moveSpeed;
        const vy = Math.sin(angle) * moveSpeed;

        // Collision with walls (cannot walk through walls)
        const nextX = soldier.x + vx;
        const nextY = soldier.y + vy;

        let blockedByWall = false;
        for (const st of structures) {
          if (st.hp > 0 && st.type.includes('wall')) {
            const halfW = st.width / 2 + 8;
            const halfH = st.height / 2 + 8;
            if (Math.abs(nextX - st.x) < halfW && Math.abs(nextY - st.y) < halfH) {
              blockedByWall = true;
              // If it's an enemy wall, strike it to clear the way!
              if (st.team === enemyTeam) {
                if (currentTime - soldier.lastAttackTime >= soldier.attackCooldown) {
                  soldier.lastAttackTime = currentTime;
                  const dmg = Math.floor(soldier.attackPower * soldier.siegeMultiplier);
                  st.hp -= dmg;
                  sounds.playSwordSlash();
                  addDamageFloater(st.x, st.y, dmg, '#fbbf24', '壁破壊');
                }
              }
              break;
            }
          }
        }

        if (!blockedByWall) {
          soldier.x = Math.max(20, Math.min(FIELD_WIDTH - 20, nextX));
          soldier.y = Math.max(30, Math.min(FIELD_HEIGHT - 30, nextY));
        }
      }
    }
  }

  // 5. Structure Destruction Events
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

      // Remove non-objective structures or keep objective marked as 0 HP
      if (!st.isObjective) {
        structures.splice(i, 1);
      }
    }
  }

  // 6. Clean up dead soldiers
  for (let i = soldiers.length - 1; i >= 0; i--) {
    const s = soldiers[i];
    if (s.hp <= 0) {
      addExplosion(s.x, s.y, '#991b1b', 8, 'smoke');
      if (s.team === 'enemy') stats.soldiersKilledByPlayer++;
      else stats.soldiersKilledByEnemy++;
      soldiers.splice(i, 1);
    }
  }

  // 7. Update Particles
  for (let i = newParticles.length - 1; i >= 0; i--) {
    const p = newParticles[i];
    p.life -= deltaTime;
    p.x += p.vx;
    p.y += p.vy;
    if (p.life <= 0) {
      newParticles.splice(i, 1);
    }
  }

  // 8. Update Damage Float Numbers
  for (let i = newDamageNumbers.length - 1; i >= 0; i--) {
    const d = newDamageNumbers[i];
    d.y -= 25 * deltaTime;
    d.opacity -= 1.2 * deltaTime;
    if (d.opacity <= 0) {
      newDamageNumbers.splice(i, 1);
    }
  }

  // 9. Win / Defeat condition
  let winner: Team | null = null;
  const currentEnemyHonjin = structures.find(s => s.team === 'enemy' && s.objectiveType === 'honjin');
  const currentPlayerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');

  if (currentEnemyHonjin && currentEnemyHonjin.hp <= 0) {
    winner = 'player';
  } else if (currentPlayerHonjin && currentPlayerHonjin.hp <= 0) {
    winner = 'enemy';
  }

  return {
    structures,
    soldiers,
    projectiles: newProjectiles,
    damageNumbers: newDamageNumbers,
    particles: newParticles,
    stats,
    winner,
  };
}
