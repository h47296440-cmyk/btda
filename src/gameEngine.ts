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
  TerrainZone,
  RallyPoint,
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
  GAME_MODES,
  GameModeConfig,
} from './gameConfig';
import { sounds } from './audio';

// Helper to create objectives for any game mode
export function createInitialObjectives(modeConfig?: GameModeConfig): Structure[] {
  const config = modeConfig || GAME_MODES['2_nations'];
  const result: Structure[] = [];

  for (const nation of config.nations) {
    // Honjin (Central Keep)
    result.push({
      id: `${nation.id}_honjin`,
      type: 'honjin',
      team: nation.id,
      x: nation.basePos.honjin.x,
      y: nation.basePos.honjin.y,
      width: 76,
      height: 76,
      hp: 3800,
      maxHp: 3800,
      cost: 0,
      isObjective: true,
      objectiveType: 'honjin',
      isInvulnerable: true,
    });

    // Maru 1 (Ninomaru)
    result.push({
      id: `${nation.id}_maru_1`,
      type: 'maru_1',
      team: nation.id,
      x: nation.basePos.maru1.x,
      y: nation.basePos.maru1.y,
      width: 62,
      height: 62,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_1',
      isInvulnerable: false,
    });

    // Maru 2 (Sannomaru)
    result.push({
      id: `${nation.id}_maru_2`,
      type: 'maru_2',
      team: nation.id,
      x: nation.basePos.maru2.x,
      y: nation.basePos.maru2.y,
      width: 62,
      height: 62,
      hp: 1800,
      maxHp: 1800,
      cost: 0,
      isObjective: true,
      objectiveType: 'maru_2',
      isInvulnerable: false,
    });
  }

  return result;
}

// Import and re-export procedural AI Castle Builder
export { generateEnemySetup } from './enemyAI';

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
  onEnemyKilled?: (x: number, y: number, bounty: number) => void,
  onPlayerKilled?: (x: number, y: number, bounty: number) => void,
  terrainZones: TerrainZone[] = [],
  battleTimeLimit: number = BATTLE_TIME_LIMIT,
  fieldWidth: number = FIELD_WIDTH,
  fieldHeight: number = FIELD_HEIGHT,
  rallyPoint?: RallyPoint | null
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
  // Defensive bounds check ensuring valid finite dimensions
  const validFieldWidth =
    typeof fieldWidth === 'number' && !isNaN(fieldWidth) && fieldWidth > 0
      ? fieldWidth
      : FIELD_WIDTH;
  const validFieldHeight =
    typeof fieldHeight === 'number' && !isNaN(fieldHeight) && fieldHeight > 0
      ? fieldHeight
      : FIELD_HEIGHT;

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

  const addExplosion = (
    x: number,
    y: number,
    color: string = '#f59e0b',
    count: number = 8,
    type: 'spark' | 'smoke' | 'debris' = 'spark'
  ) => {
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

  // 1. Check Maru states and unlock Honjin if both Maru are destroyed (per team)
  const allTeams = Array.from(new Set(structures.map(s => s.team)));
  for (const team of allTeams) {
    const maru1 = structures.find(s => s.team === team && s.objectiveType === 'maru_1' && s.hp > 0);
    const maru2 = structures.find(s => s.team === team && s.objectiveType === 'maru_2' && s.hp > 0);
    const honjin = structures.find(s => s.team === team && s.objectiveType === 'honjin');

    if (honjin) {
      const wasInvuln = honjin.isInvulnerable;
      honjin.isInvulnerable = !!(maru1 || maru2);
      if (wasInvuln && !honjin.isInvulnerable) {
        if (onHonjinExposed) onHonjinExposed(team);
        sounds.playWarHorn();
      }
    }
  }

  // 2. Tactical Bomb Processing
  if (currentBomb && !currentBomb.exploded) {
    currentBomb.progress += 2.2 * deltaTime;
    currentBomb.currentY = currentBomb.startY + (currentBomb.targetY - currentBomb.startY) * Math.min(1, currentBomb.progress);

    newParticles.push({
      id: Math.random().toString(),
      x: currentBomb.targetX + (Math.random() * 8 - 4),
      y: currentBomb.currentY,
      vx: 0,
      vy: -1,
      color: currentBomb.sourceTeam === 'player' ? '#60a5fa' : '#f43f5e',
      size: 4,
      life: 0.3,
      maxLife: 0.3,
      type: 'smoke',
    });

    if (currentBomb.progress >= 1) {
      currentBomb.exploded = true;
      sounds.playCannonBlast();
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#f97316', 24, 'smoke');
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#ef4444', 28, 'debris');
      addExplosion(currentBomb.targetX, currentBomb.targetY, '#fbbf24', 20, 'spark');

      const bombSourceTeam = currentBomb.sourceTeam || 'player';

      // Damage opposing soldiers within radius
      for (const sol of soldiers) {
        if (sol.team !== bombSourceTeam && sol.hp > 0 && dist(currentBomb.targetX, currentBomb.targetY, sol.x, sol.y) <= BOMB_CONFIG.radius) {
          sol.hp -= BOMB_CONFIG.damage;
          addDamageFloater(sol.x, sol.y, BOMB_CONFIG.damage, '#ef4444', '爆撃直撃');
        }
      }
      // Damage opposing structures within radius
      for (const st of structures) {
        if (st.team !== bombSourceTeam && st.hp > 0 && dist(currentBomb.targetX, currentBomb.targetY, st.x, st.y) <= BOMB_CONFIG.radius) {
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

  // 3. Soldier Respawn Processing (15 seconds after death)
  for (let i = newRespawnQueue.length - 1; i >= 0; i--) {
    const item = newRespawnQueue[i];
    if (currentTime >= item.respawnTime) {
      newRespawnQueue.splice(i, 1);
      const def = SOLDIER_DEFS[item.type];
      const isPlayer = item.team === 'player';

      // Find team Honjin to respawn near
      const teamHonjin = structures.find(s => s.team === item.team && s.objectiveType === 'honjin');
      const spawnX = teamHonjin ? teamHonjin.x + (Math.random() * 60 - 30) : isPlayer ? 120 : validFieldWidth - 120;
      const spawnY = teamHonjin ? teamHonjin.y + (Math.random() * 60 - 30) : validFieldHeight / 2;

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

    // Target any opposing soldier
    const targetSoldiers = soldiers.filter(
      s => s.team !== struct.team && s.hp > 0 && dist(struct.x, struct.y, s.x, s.y) <= struct.range!
    );

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
          speed: 2.8,
          damage: struct.attackPower,
          splashRadius: 75,
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
          speed: 2.2,
          damage: struct.attackPower,
          splashRadius: 95,
          type: 'boulder',
          arcHeight: 70,
        });
      } else if (struct.type === 'fire_tower') {
        sounds.playFireThrower();
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
          speed: 5.2,
          damage: struct.attackPower,
          splashRadius: 30,
          type: 'fire',
          arcHeight: 12,
        });
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

      if (p.splashRadius > 0) {
        addExplosion(p.targetX, p.targetY, '#ef4444', 16, 'smoke');
        addExplosion(p.targetX, p.targetY, '#fbbf24', 10, 'spark');
        sounds.playCannonBlast();

        for (const sol of soldiers) {
          if (sol.team !== p.sourceTeam && sol.hp > 0 && dist(p.targetX, p.targetY, sol.x, sol.y) <= p.splashRadius) {
            sol.hp -= p.damage;
            addDamageFloater(sol.x, sol.y, p.damage, '#ef4444');
          }
        }
        for (const st of structures) {
          if (st.team !== p.sourceTeam && st.hp > 0 && dist(p.targetX, p.targetY, st.x, st.y) <= p.splashRadius) {
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
          if (sol.team !== p.sourceTeam && sol.hp > 0 && dist(p.targetX, p.targetY, sol.x, sol.y) <= 24) {
            sol.hp -= p.damage;
            addDamageFloater(sol.x, sol.y, p.damage, '#f87171');
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const st of structures) {
            if (st.team !== p.sourceTeam && st.hp > 0 && dist(p.targetX, p.targetY, st.x, st.y) <= 30) {
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

  // 6. Soldier Repulsion Separation
  for (let i = 0; i < soldiers.length; i++) {
    const s1 = soldiers[i];
    if (s1.hp <= 0) continue;
    for (let j = i + 1; j < soldiers.length; j++) {
      const s2 = soldiers[j];
      if (s2.hp <= 0) continue;
      const d = dist(s1.x, s1.y, s2.x, s2.y);
      const minDistance = s1.team === s2.team ? 20 : 18;
      if (d < minDistance && d > 0.001) {
        const overlap = minDistance - d;
        const push = (overlap / 2) * 0.5;
        const nx = (s2.x - s1.x) / d;
        const ny = (s2.y - s1.y) / d;
        s1.x -= nx * push;
        s1.y -= ny * push;
        s2.x += nx * push;
        s2.y += ny * push;
      }
    }
  }

  // 7. Soldier Targeting, Manual Movement (Waypoints & Rally), and Combat
  for (const soldier of soldiers) {
    if (soldier.hp <= 0) continue;

    const isPlayer = soldier.team === 'player';
    let targetEntity: { x: number; y: number; id: string; type: 'soldier' | 'structure'; hp: number; isInvulnerable?: boolean } | null = null;

    // Check immediate nearby opposing soldiers within attack reach
    const immediateEnemies = soldiers.filter(
      s => s.team !== soldier.team && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= soldier.attackRange + 15
    );

    if (immediateEnemies.length > 0) {
      immediateEnemies.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
      targetEntity = {
        x: immediateEnemies[0].x,
        y: immediateEnemies[0].y,
        id: immediateEnemies[0].id,
        type: 'soldier',
        hp: immediateEnemies[0].hp,
      };
    } else if (soldier.waypointPath && soldier.waypointPath.length > 0) {
      // MANUAL DRAWN MARCH PATH GUIDANCE (なぞり進軍路)
      const currentWaypoint = soldier.waypointPath[0];
      const dToWaypoint = dist(soldier.x, soldier.y, currentWaypoint.x, currentWaypoint.y);
      if (dToWaypoint <= 20) {
        soldier.waypointPath.shift();
      }
      if (soldier.waypointPath.length > 0) {
        const nextWp = soldier.waypointPath[0];
        targetEntity = {
          x: nextWp.x,
          y: nextWp.y,
          id: 'waypoint',
          type: 'structure',
          hp: 9999,
        };
      }
    } else if (soldier.rallyTarget) {
      // MANUAL RALLY POINT GUIDANCE (集合地点指図)
      const dToRally = dist(soldier.x, soldier.y, soldier.rallyTarget.x, soldier.rallyTarget.y);
      if (dToRally > 38) {
        targetEntity = {
          x: soldier.rallyTarget.x,
          y: soldier.rallyTarget.y,
          id: 'rally_point',
          type: 'structure',
          hp: 9999,
        };
      }
    }

    // Default Autonomous Stance AI if no manual order or immediate threat
    if (!targetEntity) {
      if (soldier.stance === 'attack') {
        // Find opponent Maru or Honjin
        const opponentMarus = structures.filter(
          s => s.team !== soldier.team && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp > 0
        );

        let primaryObjective: Structure | undefined;
        if (opponentMarus.length > 0) {
          opponentMarus.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          primaryObjective = opponentMarus[0];
        } else {
          const opponentHonjins = structures.filter(
            s => s.team !== soldier.team && s.objectiveType === 'honjin' && s.hp > 0
          );
          if (opponentHonjins.length > 0) {
            opponentHonjins.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
            primaryObjective = opponentHonjins[0];
          }
        }

        // Check if any opponent walls/turrets are directly blocking the advance
        const blockingStructures = structures.filter(
          s => s.team !== soldier.team && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 85
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
        // Intercept any opponent invading near home base
        const homeHonjin = structures.find(s => s.team === soldier.team && s.objectiveType === 'honjin');
        const homeBaseX = homeHonjin ? homeHonjin.x : isPlayer ? 160 : fieldWidth - 160;
        const homeBaseY = homeHonjin ? homeHonjin.y : fieldHeight / 2;

        const invadingEnemies = soldiers.filter(
          s => s.team !== soldier.team && s.hp > 0 && dist(homeBaseX, homeBaseY, s.x, s.y) <= 360
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
          // Patrol anchor in front of home Honjin
          const dirToCenter = Math.atan2(fieldHeight / 2 - homeBaseY, fieldWidth / 2 - homeBaseX);
          const anchorX = homeBaseX + Math.cos(dirToCenter) * 120;
          const anchorY = homeBaseY + Math.sin(dirToCenter) * 120;
          targetEntity = {
            x: anchorX,
            y: anchorY,
            id: 'patrol',
            type: 'structure',
            hp: 9999,
          };
        }
      } else {
        // Hybrid stance: skirmish in midfield or assault nearest opponent
        const nearbyOpponents = soldiers.filter(
          s => s.team !== soldier.team && s.hp > 0 && dist(soldier.x, soldier.y, s.x, s.y) <= 280
        );

        if (nearbyOpponents.length > 0) {
          nearbyOpponents.sort((a, b) => dist(soldier.x, soldier.y, a.x, a.y) - dist(soldier.x, soldier.y, b.x, b.y));
          targetEntity = {
            x: nearbyOpponents[0].x,
            y: nearbyOpponents[0].y,
            id: nearbyOpponents[0].id,
            type: 'soldier',
            hp: nearbyOpponents[0].hp,
          };
        } else {
          const activeMaru = structures.filter(
            s => s.team !== soldier.team && (s.objectiveType === 'maru_1' || s.objectiveType === 'maru_2') && s.hp > 0
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
            const oppHon = structures.find(s => s.team !== soldier.team && s.objectiveType === 'honjin' && s.hp > 0);
            if (oppHon) {
              targetEntity = {
                x: oppHon.x,
                y: oppHon.y,
                id: oppHon.id,
                type: 'structure',
                hp: oppHon.hp,
                isInvulnerable: oppHon.isInvulnerable,
              };
            }
          }
        }
      }
    }

    if (targetEntity) {
      soldier.targetX = targetEntity.x;
      soldier.targetY = targetEntity.y;
      soldier.targetId = targetEntity.id;
      soldier.targetType = targetEntity.type;

      const d = dist(soldier.x, soldier.y, targetEntity.x, targetEntity.y);
      const isWithinAttackRange = d <= soldier.attackRange;

      soldier.facing = Math.atan2(targetEntity.y - soldier.y, targetEntity.x - soldier.x);

      if (isWithinAttackRange && targetEntity.id !== 'patrol' && targetEntity.id !== 'waypoint' && targetEntity.id !== 'rally_point') {
        // Combat Attack
        if (currentTime - soldier.lastAttackTime >= soldier.attackCooldown) {
          soldier.lastAttackTime = currentTime;
          soldier.isAttacking = true;
          soldier.attackAnimTimer = 0.2;

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
              speed: 4.8,
              damage,
              splashRadius: 0,
              type: 'arrow',
              arcHeight: 25,
            });
          } else {
            // Melee Slash or Strike
            sounds.playSwordSlash();

            if (targetEntity.type === 'soldier') {
              const enemySol = soldiers.find(s => s.id === targetEntity!.id);
              if (enemySol) {
                enemySol.hp -= damage;
                addDamageFloater(enemySol.x, enemySol.y, damage, isPlayer ? '#ef4444' : '#60a5fa');
                addExplosion(enemySol.x, enemySol.y, '#f87171', 4, 'spark');

                if (enemySol.hp <= 0) {
                  soldier.kills++;
                }
              }
            } else {
              const str = structures.find(s => s.id === targetEntity!.id);
              if (str) {
                if (str.isInvulnerable) {
                  sounds.playShieldDeflect();
                  addDamageFloater(str.x, str.y, 0, '#60a5fa', '結界防御');
                } else {
                  str.hp -= damage;
                  addDamageFloater(str.x, str.y, damage, '#f59e0b');
                  addExplosion(str.x, str.y, '#d97706', 4, 'debris');

                  if (str.spikeDamage && str.spikeDamage > 0) {
                    soldier.hp -= str.spikeDamage;
                    addDamageFloater(soldier.x, soldier.y, str.spikeDamage, '#dc2626', '反撃');
                  }
                }
              }
            }
          }
        }
      } else {
        // MOVEMENT WITH TERRAIN HAZARD EFFECTS (沼地・氷原)
        let speedMultiplier = 1.0;

        for (const zone of terrainZones) {
          if (
            soldier.x >= zone.x &&
            soldier.x <= zone.x + zone.width &&
            soldier.y >= zone.y &&
            soldier.y <= zone.y + zone.height
          ) {
            if (zone.type === 'swamp') {
              // Swamp slows foot movement down to 0.42x
              speedMultiplier = 0.42;
              if (Math.random() < 0.12) {
                newParticles.push({
                  id: Math.random().toString(),
                  x: soldier.x + (Math.random() * 8 - 4),
                  y: soldier.y + 6,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -Math.random() * 1.5,
                  color: '#3d2817',
                  size: 3,
                  life: 0.25,
                  maxLife: 0.25,
                  type: 'debris',
                });
              }
            } else if (zone.type === 'ice') {
              // Ice increases sliding speed to 1.55x
              speedMultiplier = 1.55;
              if (Math.random() < 0.16) {
                newParticles.push({
                  id: Math.random().toString(),
                  x: soldier.x + (Math.random() * 8 - 4),
                  y: soldier.y + (Math.random() * 6 - 3),
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  color: '#e0f2fe',
                  size: 2.5,
                  life: 0.3,
                  maxLife: 0.3,
                  type: 'spark',
                });
              }
            }
          }
        }

        const moveDist = soldier.speed * speedMultiplier * 55 * deltaTime;
        const angle = Math.atan2(targetEntity.y - soldier.y, targetEntity.x - soldier.x);
        const directStepX = soldier.x + Math.cos(angle) * moveDist;
        const directStepY = soldier.y + Math.sin(angle) * moveDist;

        // Obstacle collision check (Friendly structures are passable)
        const checkObstacle = (px: number, py: number) => {
          if (px < 18 || px > validFieldWidth - 18 || py < 25 || py > validFieldHeight - 25) {
            return 'boundary';
          }
          for (const st of structures) {
            if (st.hp <= 0) continue;
            if (st.team === soldier.team) continue;
            if (targetEntity && targetEntity.id === st.id) continue;

            const halfW = (st.width || 36) / 2 + 10;
            const halfH = (st.height || 36) / 2 + 10;
            if (Math.abs(px - st.x) < halfW && Math.abs(py - st.y) < halfH) {
              return st;
            }
          }
          return null;
        };

        const obsStep = checkObstacle(directStepX, directStepY);

        if (!obsStep) {
          soldier.x = Math.max(20, Math.min(validFieldWidth - 20, directStepX));
          soldier.y = Math.max(30, Math.min(validFieldHeight - 30, directStepY));
          soldier.stuckTimer = 0;
        } else {
          // If attacking wall directly, damage it
          if (obsStep !== 'boundary' && obsStep.team !== soldier.team && obsStep.type.includes('wall')) {
            if (currentTime - soldier.lastAttackTime >= soldier.attackCooldown) {
              soldier.lastAttackTime = currentTime;
              const dmg = Math.floor(soldier.attackPower * soldier.siegeMultiplier);
              obsStep.hp -= dmg;
              addDamageFloater(obsStep.x, obsStep.y, dmg, '#f59e0b');
              addExplosion(obsStep.x, obsStep.y, '#78716c', 3, 'debris');
              sounds.playSwordSlash();
            }
          }

          // Smart steering around obstacle
          if (!soldier.avoidDir) {
            soldier.avoidDir = Math.random() < 0.5 ? 1 : -1;
          }

          const avoidAngle = angle + soldier.avoidDir * (Math.PI / 2.5);
          const avoidStepX = soldier.x + Math.cos(avoidAngle) * moveDist * 0.9;
          const avoidStepY = soldier.y + Math.sin(avoidAngle) * moveDist * 0.9;

          if (!checkObstacle(avoidStepX, avoidStepY)) {
            soldier.x = Math.max(20, Math.min(validFieldWidth - 20, avoidStepX));
            soldier.y = Math.max(30, Math.min(validFieldHeight - 30, avoidStepY));
          } else {
            // Try opposite direction
            soldier.avoidDir = -soldier.avoidDir;
            const altAngle = angle + soldier.avoidDir * (Math.PI / 2.5);
            const altX = soldier.x + Math.cos(altAngle) * moveDist * 0.9;
            const altY = soldier.y + Math.sin(altAngle) * moveDist * 0.9;
            if (!checkObstacle(altX, altY)) {
              soldier.x = Math.max(20, Math.min(validFieldWidth - 20, altX));
              soldier.y = Math.max(30, Math.min(validFieldHeight - 30, altY));
            }
          }
        }
      }
    }

    if (soldier.attackAnimTimer && soldier.attackAnimTimer > 0) {
      soldier.attackAnimTimer -= deltaTime;
      if (soldier.attackAnimTimer <= 0) {
        soldier.isAttacking = false;
      }
    }

    // Failsafe recovery against NaN coordinates to prevent vanishing soldiers
    if (isNaN(soldier.x) || isNaN(soldier.y)) {
      soldier.x = isPlayer ? 120 : validFieldWidth - 120;
      soldier.y = validFieldHeight / 2;
    }
  }

  // 8. Clean up destroyed structures
  for (let i = structures.length - 1; i >= 0; i--) {
    const st = structures[i];
    if (st.hp <= 0) {
      sounds.playWallBreak();
      addExplosion(st.x, st.y, '#78716c', 16, 'debris');
      addExplosion(st.x, st.y, '#ef4444', 10, 'spark');

      if (st.type.includes('wall')) {
        if (st.team !== 'player') stats.wallsDestroyedByPlayer++;
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

  // 9. Clean up dead soldiers & Queue for 15-second respawn + Give Gold Bounties
  for (let i = soldiers.length - 1; i >= 0; i--) {
    const s = soldiers[i];
    if (s.hp <= 0) {
      addExplosion(s.x, s.y, '#991b1b', 8, 'smoke');

      if (s.team !== 'player') {
        stats.soldiersKilledByPlayer++;
        if (onEnemyKilled) {
          onEnemyKilled(s.x, s.y, KILL_BOUNTY_GOLD);
        }
        addDamageFloater(s.x, s.y - 12, KILL_BOUNTY_GOLD, '#facc15', '+金');
      } else {
        stats.soldiersKilledByEnemy++;
        if (onPlayerKilled) {
          onPlayerKilled(s.x, s.y, KILL_BOUNTY_GOLD);
        }
        addDamageFloater(s.x, s.y - 12, KILL_BOUNTY_GOLD, '#f87171', '+敵軍金');
      }

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

  // 10. Update Particles
  for (let i = newParticles.length - 1; i >= 0; i--) {
    const p = newParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= deltaTime;
    if (p.life <= 0) {
      newParticles.splice(i, 1);
    }
  }

  // 11. Update Floating Damage Numbers
  for (let i = newDamageNumbers.length - 1; i >= 0; i--) {
    const d = newDamageNumbers[i];
    d.y -= 25 * deltaTime;
    d.opacity -= 1.2 * deltaTime;
    if (d.opacity <= 0) {
      newDamageNumbers.splice(i, 1);
    }
  }

  // 12. Win / Defeat condition
  let winner: Winner = null;
  const currentPlayerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');
  const enemyHonjins = structures.filter(s => s.team !== 'player' && s.objectiveType === 'honjin');

  if (currentPlayerHonjin && currentPlayerHonjin.hp <= 0) {
    winner = 'enemy';
    stats.endReason = 'honjin_destroyed';
  } else if (enemyHonjins.length > 0 && enemyHonjins.every(h => h.hp <= 0)) {
    winner = 'player';
    stats.endReason = 'honjin_destroyed';
  } else if (battleElapsedSeconds >= battleTimeLimit) {
    stats.endReason = 'time_limit';

    // Calculate total base HP for each team
    const teamHps: Record<string, number> = {};
    for (const team of allTeams) {
      const hHonjin = structures.find(s => s.team === team && s.objectiveType === 'honjin');
      const hMaru1 = structures.find(s => s.team === team && s.objectiveType === 'maru_1');
      const hMaru2 = structures.find(s => s.team === team && s.objectiveType === 'maru_2');
      const totalHp =
        Math.max(0, hHonjin?.hp || 0) +
        Math.max(0, hMaru1?.hp || 0) +
        Math.max(0, hMaru2?.hp || 0);
      teamHps[team] = totalHp;
    }

    stats.playerTotalHp = teamHps['player'] || 0;
    const opponentTeams = Object.keys(teamHps).filter(t => t !== 'player');
    const maxOpponentHp = Math.max(0, ...opponentTeams.map(t => teamHps[t] || 0));
    stats.enemyTotalHp = maxOpponentHp;

    if (stats.playerTotalHp > maxOpponentHp) {
      winner = 'player';
    } else if (maxOpponentHp > stats.playerTotalHp) {
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
