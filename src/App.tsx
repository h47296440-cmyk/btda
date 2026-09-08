/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Structure,
  Soldier,
  Projectile,
  DamageNumber,
  Particle,
  GamePhase,
  SoldierStance,
  GameStats,
  Team,
  Winner,
  MaterialType,
  TurretType,
  SoldierType,
  RespawnQueueItem,
  TacticalBomb,
} from './types';
import {
  STARTING_BUDGET,
  BUILD_TIME_LIMIT,
  BATTLE_TIME_LIMIT,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  BOMB_CONFIG,
  KILL_BOUNTY_GOLD,
} from './gameConfig';
import {
  createInitialObjectives,
  generateEnemySetup,
  updateGameStep,
} from './gameEngine';
import {
  evaluateEnemyTacticalBomb,
  evaluateEnemyReinforcements,
  evaluateEnemyTacticalStance,
} from './enemyAI';
import { sounds } from './audio';
import { BattleCanvas } from './components/BattleCanvas';
import { BuildPanel } from './components/BuildPanel';
import { BattleHUD } from './components/BattleHUD';
import { ResultModal, HelpModal } from './components/GameModal';
import { Castle, HelpCircle, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  // Game Phase
  const [phase, setPhase] = useState<GamePhase>('build');

  // Structures & Units
  const [structures, setStructures] = useState<Structure[]>(() => createInitialObjectives());
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [respawnQueue, setRespawnQueue] = useState<RespawnQueueItem[]>([]);

  // Special Weapon: Tactical Bomb (Player & Enemy)
  const [tacticalBomb, setTacticalBomb] = useState<TacticalBomb | null>(null);
  const [hasBomb, setHasBomb] = useState<boolean>(false);
  const [isBombUsed, setIsBombUsed] = useState<boolean>(false);
  const [isBombTargeting, setIsBombTargeting] = useState<boolean>(false);

  // Enemy CPU Parity: Budget, Bomb, and Strategy
  const [enemyBattleFunds, setEnemyBattleFunds] = useState<number>(180);
  const [enemyHasBomb, setEnemyHasBomb] = useState<boolean>(true);
  const [enemyIsBombUsed, setEnemyIsBombUsed] = useState<boolean>(false);
  const [enemyStrategyName, setEnemyStrategyName] = useState<string>('剛柔兼備・名将陣');
  const [enemyOverallStance, setEnemyOverallStance] = useState<SoldierStance>('defense');
  const lastEnemyReinforceTimeRef = useRef<number>(0);
  const lastEnemyTacticalCheckRef = useRef<number>(0);

  // Economics & Preparation
  const [playerBudget, setPlayerBudget] = useState<number>(STARTING_BUDGET);
  const [buildTimeLeft, setBuildTimeLeft] = useState<number>(BUILD_TIME_LIMIT);
  const [battleTime, setBattleTime] = useState<number>(0);
  const [battleFunds, setBattleFunds] = useState<number>(180);

  // Speed & Audio
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Selection & Tools
  const [selectedCategory, setSelectedCategory] = useState<'wall' | 'turret' | 'soldier'>('wall');
  const [selectedItemId, setSelectedItemId] = useState<string>('wood_wall');
  const [soldierStance, setSoldierStance] = useState<SoldierStance>('defense');
  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Notifications & Modals
  const [eventBanner, setEventBanner] = useState<{ message: string; team: Team; time: number } | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [winner, setWinner] = useState<Winner>(null);
  const [enemyStrategyIndex, setEnemyStrategyIndex] = useState<number>(0);

  // Game Statistics
  const [stats, setStats] = useState<GameStats>({
    wallsDestroyedByPlayer: 0,
    wallsDestroyedByEnemy: 0,
    soldiersKilledByPlayer: 0,
    soldiersKilledByEnemy: 0,
    damageDealtByPlayer: 0,
    damageDealtByEnemy: 0,
    winner: null,
  });

  // Reference for game loop
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const gameTimeRef = useRef<number>(0);

  // Initialize Enemy AI Setup at start
  const initEnemy = useCallback((strategyIdx: number) => {
    const enemySetup = generateEnemySetup(STARTING_BUDGET, strategyIdx);
    setStructures(prev => {
      const baseObjectives = createInitialObjectives();
      const playerPlaced = prev.filter(s => s.team === 'player' && !s.isObjective);
      return [...baseObjectives, ...playerPlaced, ...enemySetup.structures];
    });
    setSoldiers(prev => {
      const playerSoldiers = prev.filter(s => s.team === 'player');
      return [...playerSoldiers, ...enemySetup.soldiers];
    });
    setEnemyBattleFunds(Math.max(180, enemySetup.remainingFunds + 180));
    setEnemyHasBomb(enemySetup.hasBomb);
    setEnemyIsBombUsed(false);
    setEnemyStrategyName(enemySetup.strategyName);
    setEnemyOverallStance('defense');
    lastEnemyReinforceTimeRef.current = 0;
    lastEnemyTacticalCheckRef.current = 0;
  }, []);

  // Initialize match on first mount
  useEffect(() => {
    initEnemy(0);
  }, [initEnemy]);

  // Build Phase Countdown Timer
  useEffect(() => {
    if (phase !== 'build') return;

    const interval = setInterval(() => {
      setBuildTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startBattle();
          return 0;
        }
        if (prev === 6) {
          sounds.playWarHorn();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Transition to Battle
  const startBattle = () => {
    setPhase('battle');
    sounds.playWarHorn();
    setEventBanner({
      message: '⚔️ 両軍出陣！まずは敵の「二の丸」「三の丸」を破壊せよ！',
      team: 'player',
      time: Date.now(),
    });
  };

  // Main Battle Simulation Loop
  useEffect(() => {
    if (phase !== 'battle') return;

    const animate = (time: number) => {
      const rawDelta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Cap delta time to avoid physics tunneling
      const dt = Math.min(0.08, rawDelta) * (isPaused ? 0 : gameSpeed);
      gameTimeRef.current += dt;

      if (!isPaused && dt > 0) {
        setBattleTime(prev => {
          const newTime = prev + dt;

          // Passive battle funds generation (+3 Gold/s)
          setBattleFunds(f => Math.min(800, f + 3 * dt));
          // AI Passive battle funds generation (+3 Gold/s)
          setEnemyBattleFunds(f => Math.min(800, f + 3 * dt));

          // 1. Check if Enemy CPU triggers Tactical Bomb
          if (enemyHasBomb && !enemyIsBombUsed && !tacticalBomb) {
            const bombTarget = evaluateEnemyTacticalBomb(
              soldiers,
              structures,
              enemyHasBomb,
              enemyIsBombUsed,
              newTime
            );
            if (bombTarget) {
              setEnemyIsBombUsed(true);
              setTacticalBomb({
                id: 'enemy_bomb_' + Date.now(),
                sourceTeam: 'enemy',
                targetX: bombTarget.targetX,
                targetY: bombTarget.targetY,
                startY: -80,
                currentY: -80,
                progress: 0,
                exploded: false,
              });
              sounds.playWarHorn();
              setEventBanner({
                message: `⚠️ 敵軍が戦術爆弾を投下しました！直ちに退避せよ！`,
                team: 'enemy',
                time: Date.now(),
              });
            }
          }

          // 2. Check if Enemy CPU spawns Reinforcements
          const enemySpawn = evaluateEnemyReinforcements(
            enemyBattleFunds,
            soldiers,
            structures,
            gameTimeRef.current,
            lastEnemyReinforceTimeRef.current
          );
          if (enemySpawn) {
            lastEnemyReinforceTimeRef.current = gameTimeRef.current;
            setEnemyBattleFunds(f => Math.max(0, f - enemySpawn.cost));
            const spawnX = FIELD_WIDTH - (140 + Math.random() * 40);
            const spawnY = FIELD_HEIGHT / 2 + (Math.random() * 120 - 60);
            const def = SOLDIER_DEFS[enemySpawn.type];
            setSoldiers(prev => [
              ...prev,
              {
                id: 'enemy_reinforce_' + Math.random().toString(36).substring(2, 9),
                type: enemySpawn.type,
                team: 'enemy',
                stance: enemySpawn.stance,
                x: spawnX,
                y: spawnY,
                targetX: spawnX,
                targetY: spawnY,
                hp: def.hp!,
                maxHp: def.hp!,
                speed: def.speed!,
                attackPower: def.attack!,
                attackRange: enemySpawn.type === 'archer' ? 190 : enemySpawn.type === 'cavalry' ? 34 : 28,
                attackCooldown:
                  enemySpawn.type === 'samurai'
                    ? 0.8
                    : enemySpawn.type === 'archer'
                    ? 1.2
                    : enemySpawn.type === 'cavalry'
                    ? 1.1
                    : 1.0,
                lastAttackTime: 0,
                targetId: null,
                targetType: null,
                siegeMultiplier: enemySpawn.type === 'sapper' ? 3.5 : 1.0,
                cost: def.cost,
                kills: 0,
                facing: Math.PI,
              },
            ]);
            setEventBanner({
              message: enemySpawn.message,
              team: 'enemy',
              time: Date.now(),
            });
          }

          // 3. Dynamic Enemy Tactical Stance Evaluation (every ~3.5 seconds)
          if (gameTimeRef.current - lastEnemyTacticalCheckRef.current >= 3.5) {
            lastEnemyTacticalCheckRef.current = gameTimeRef.current;
            const tacticalCommand = evaluateEnemyTacticalStance(
              soldiers,
              structures,
              enemyOverallStance,
              newTime
            );
            if (tacticalCommand) {
              setEnemyOverallStance(tacticalCommand.overallStance);
              setSoldiers(prev =>
                prev.map(s => {
                  if (s.team !== 'enemy') return s;
                  const matched = tacticalCommand.newStances.find(n => n.id === s.id);
                  return matched ? { ...s, stance: matched.stance } : s;
                })
              );
              if (tacticalCommand.bannerMessage) {
                setEventBanner({
                  message: tacticalCommand.bannerMessage,
                  team: 'enemy',
                  time: Date.now(),
                });
                sounds.playWarHorn();
              }
            }
          }

          setStructures(prevStructs => {
            setSoldiers(prevSoldiers => {
              const stepResult = updateGameStep(
                prevStructs,
                prevSoldiers,
                projectiles,
                damageNumbers,
                particles,
                respawnQueue,
                tacticalBomb,
                stats,
                dt,
                gameTimeRef.current,
                newTime,
                // Callback when a Maru falls
                (team, maruType) => {
                  const isPlayerVictim = team === 'player';
                  setEventBanner({
                    message: isPlayerVictim
                      ? `⚠️ 自軍の【${maruType}】が陥落しました！`
                      : `💥 敵軍の【${maruType}】を撃破！`,
                    team,
                    time: Date.now(),
                  });
                  sounds.playWallBreak();
                },
                // Callback when Honjin is exposed (both Maru destroyed)
                team => {
                  const isPlayerExposed = team === 'player';
                  setEventBanner({
                    message: isPlayerExposed
                      ? `🚨 警報！自陣の二の丸・三の丸が両方陥落！本陣の結界が消滅！`
                      : `🔥 好機！敵の二の丸・三の丸を完全撃破！敵本陣へ攻撃可能！`,
                    team,
                    time: Date.now(),
                  });
                  sounds.playWarHorn();
                },
                // Callback when enemy soldier killed: award player gold bounty!
                (_x, _y, bounty) => {
                  setBattleFunds(f => Math.min(800, f + bounty));
                },
                // Callback when player soldier killed: award enemy CPU gold bounty!
                (_x, _y, bounty) => {
                  setEnemyBattleFunds(f => Math.min(800, f + bounty));
                }
              );

              // Sync visual buffers and simulation state
              setProjectiles(stepResult.projectiles);
              setDamageNumbers(stepResult.damageNumbers);
              setParticles(stepResult.particles);
              setRespawnQueue(stepResult.respawnQueue);
              setTacticalBomb(stepResult.tacticalBomb);
              setStats(stepResult.stats);

              // Check victory / defeat / draw
              if (stepResult.winner && phase === 'battle') {
                setWinner(stepResult.winner);
                setPhase('ended');
                if (stepResult.winner === 'player') {
                  sounds.playVictory();
                } else {
                  sounds.playDefeat();
                }
              }

              return stepResult.soldiers;
            });

            return prevStructs;
          });

          return newTime;
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [phase, isPaused, gameSpeed, projectiles, damageNumbers, particles, respawnQueue, tacticalBomb, stats]);

  // Handle Banner timeout
  useEffect(() => {
    if (!eventBanner) return;
    const t = setTimeout(() => {
      setEventBanner(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [eventBanner]);

  // Continuous Drag-to-Draw Wall Placement
  const handlePlaceWallSegment = (x: number, y: number): boolean => {
    if (phase !== 'build' || selectedCategory !== 'wall') return false;
    const def = WALL_DEFS[selectedItemId as MaterialType];
    if (!def || playerBudget < def.cost) return false;

    // Check bounds
    if (
      x < PLAYER_BUILD_ZONE.minX ||
      x > PLAYER_BUILD_ZONE.maxX ||
      y < PLAYER_BUILD_ZONE.minY ||
      y > PLAYER_BUILD_ZONE.maxY
    ) {
      return false;
    }

    // Check distance to existing structures to avoid stacking on top
    for (const s of structures) {
      if (Math.hypot(s.x - x, s.y - y) < 22) {
        return false;
      }
    }

    setPlayerBudget(b => b - def.cost);
    setStructures(prev => [
      ...prev,
      {
        id: 'player_wall_' + Math.random().toString(36).substring(2, 9),
        type: selectedItemId as MaterialType,
        team: 'player',
        x,
        y,
        width: 34,
        height: 34,
        hp: def.hp!,
        maxHp: def.hp!,
        cost: def.cost,
        spikeDamage: selectedItemId === 'spike_wall' ? 20 : 0,
      },
    ]);
    sounds.playPlace();
    return true;
  };

  // Click on Canvas for single placements & refunds
  const handleCanvasClick = (x: number, y: number) => {
    if (phase !== 'build') return;

    // Check if clicking existing player-placed item to remove & refund
    const clickedItem = structures.find(
      s => s.team === 'player' && !s.isObjective && Math.hypot(s.x - x, s.y - y) <= s.width / 2 + 10
    );

    if (clickedItem) {
      // Refund 100%
      setPlayerBudget(b => b + clickedItem.cost);
      setStructures(prev => prev.filter(s => s.id !== clickedItem.id));
      sounds.playPlace();
      return;
    }

    const clickedSoldier = soldiers.find(
      s => s.team === 'player' && Math.hypot(s.x - x, s.y - y) <= 20
    );

    if (clickedSoldier) {
      // Refund soldier
      setPlayerBudget(b => b + clickedSoldier.cost);
      setSoldiers(prev => prev.filter(s => s.id !== clickedSoldier.id));
      sounds.playPlace();
      return;
    }

    // Otherwise, place new wall, turret or soldier if inside player build zone
    if (
      x < PLAYER_BUILD_ZONE.minX ||
      x > PLAYER_BUILD_ZONE.maxX ||
      y < PLAYER_BUILD_ZONE.minY ||
      y > PLAYER_BUILD_ZONE.maxY
    ) {
      return;
    }

    if (selectedCategory === 'wall') {
      const def = WALL_DEFS[selectedItemId as MaterialType];
      if (!def || playerBudget < def.cost) return;

      // Check distance to existing structures to avoid duplicate stacking
      for (const s of structures) {
        if (Math.hypot(s.x - x, s.y - y) < 22) return;
      }

      setPlayerBudget(b => b - def.cost);
      setStructures(prev => [
        ...prev,
        {
          id: 'player_wall_' + Math.random().toString(36).substring(2, 9),
          type: selectedItemId as MaterialType,
          team: 'player',
          x,
          y,
          width: 34,
          height: 34,
          hp: def.hp!,
          maxHp: def.hp!,
          cost: def.cost,
          spikeDamage: selectedItemId === 'spike_wall' ? 20 : 0,
        },
      ]);
      sounds.playPlace();
    } else if (selectedCategory === 'turret') {
      const def = TURRET_DEFS[selectedItemId as TurretType];
      if (!def || playerBudget < def.cost) return;

      setPlayerBudget(b => b - def.cost);
      setStructures(prev => [
        ...prev,
        {
          id: 'player_turret_' + Math.random().toString(36).substring(2, 9),
          type: selectedItemId as TurretType,
          team: 'player',
          x,
          y,
          width: 44,
          height: 44,
          hp: def.hp!,
          maxHp: def.hp!,
          cost: def.cost,
          range: def.range!,
          attackPower: def.attack!,
          attackCooldown:
            selectedItemId === 'fire_tower'
              ? 0.35
              : selectedItemId === 'arrow_tower'
              ? 1.0
              : selectedItemId === 'cannon_battery'
              ? 2.3
              : 3.0,
          lastAttackTime: 0,
        },
      ]);
      sounds.playPlace();
    } else if (selectedCategory === 'soldier') {
      const def = SOLDIER_DEFS[selectedItemId as SoldierType];
      if (!def || playerBudget < def.cost) return;

      setPlayerBudget(b => b - def.cost);
      setSoldiers(prev => [
        ...prev,
        {
          id: 'player_sol_' + Math.random().toString(36).substring(2, 9),
          type: selectedItemId as SoldierType,
          team: 'player',
          stance: soldierStance,
          x,
          y,
          targetX: x,
          targetY: y,
          hp: def.hp!,
          maxHp: def.hp!,
          speed: def.speed!,
          attackPower: def.attack!,
          attackRange: selectedItemId === 'archer' ? 190 : selectedItemId === 'cavalry' ? 34 : 28,
          attackCooldown:
            selectedItemId === 'samurai'
              ? 0.8
              : selectedItemId === 'archer'
              ? 1.2
              : selectedItemId === 'cavalry'
              ? 1.1
              : 1.0,
          lastAttackTime: 0,
          targetId: null,
          targetType: null,
          siegeMultiplier: selectedItemId === 'sapper' ? 3.5 : 1.0,
          cost: def.cost,
          kills: 0,
          facing: 0,
        },
      ]);
      sounds.playPlace();
    }
  };

  // Bomb Purchase & Refund
  const handleBuyBomb = () => {
    if (playerBudget < BOMB_CONFIG.cost || hasBomb) return;
    setPlayerBudget(b => b - BOMB_CONFIG.cost);
    setHasBomb(true);
    sounds.playPlace();
  };

  const handleRefundBomb = () => {
    if (!hasBomb) return;
    setPlayerBudget(b => b + BOMB_CONFIG.cost);
    setHasBomb(false);
    sounds.playPlace();
  };

  // Bomb Targeting & Drop
  const handleToggleBombTargeting = () => {
    if (!hasBomb || isBombUsed) return;
    setIsBombTargeting(prev => !prev);
  };

  const handleDropBomb = (x: number, y: number) => {
    if (!hasBomb || isBombUsed) return;

    setTacticalBomb({
      id: 'bomb_' + Date.now(),
      startY: -40,
      currentY: -40,
      targetX: x,
      targetY: y,
      radius: BOMB_CONFIG.radius,
      damage: BOMB_CONFIG.damage,
      progress: 0,
      exploded: false,
    });

    setIsBombUsed(true);
    setIsBombTargeting(false);
    sounds.playCannonBlast();
    setEventBanner({
      message: '💣 決戦援護爆弾を投下！目標地点に着弾中！',
      team: 'player',
      time: Date.now(),
    });
  };

  // In-battle Emergency Reinforcement Spawn
  const handleSpawnReinforcement = (type: SoldierType, stance: SoldierStance) => {
    const def = SOLDIER_DEFS[type];
    if (battleFunds < def.cost) return;

    setBattleFunds(b => b - def.cost);
    const spawnX = 140 + Math.random() * 40;
    const spawnY = FIELD_HEIGHT / 2 + (Math.random() * 120 - 60);

    setSoldiers(prev => [
      ...prev,
      {
        id: 'player_reinforce_' + Math.random().toString(36).substring(2, 9),
        type,
        team: 'player',
        stance,
        x: spawnX,
        y: spawnY,
        targetX: spawnX,
        targetY: spawnY,
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
        facing: 0,
      },
    ]);
    sounds.playPlace();
  };

  // Change Stance of a specific soldier during battle or prep
  const handleChangeStance = (soldierId: string, newStance: SoldierStance) => {
    setSoldiers(prev =>
      prev.map(s => {
        if (s.id === soldierId) {
          return { ...s, stance: newStance };
        }
        return s;
      })
    );
  };

  // Change Stance of ALL player soldiers simultaneously
  const handleChangeAllStances = (newStance: SoldierStance) => {
    setSoldiers(prev =>
      prev.map(s => (s.team === 'player' ? { ...s, stance: newStance } : s))
    );
    setSoldierStance(newStance);
    sounds.playTaikoDrum();
    const stanceName =
      newStance === 'attack'
        ? '全軍突撃（攻）'
        : newStance === 'defense'
        ? '全軍防衛（守）'
        : '全軍遊撃（遊）';
    setEventBanner({
      message: `【全軍号令】${stanceName} に全兵士の作戦を一斉変更！`,
      team: 'player',
      time: Date.now(),
    });
  };

  // Presets Application
  const handleApplyPreset = (preset: 'balanced' | 'artillery' | 'assault') => {
    const baseObjectives = createInitialObjectives();
    const enemyStructures = structures.filter(s => s.team === 'enemy' && !s.isObjective);
    const enemySoldiers = soldiers.filter(s => s.team === 'enemy');

    const newPlayerStructures: Structure[] = [];
    const newPlayerSoldiers: Soldier[] = [];
    let budget = STARTING_BUDGET;

    const addPWall = (x: number, y: number, type: MaterialType) => {
      const def = WALL_DEFS[type];
      if (budget < def.cost) return;
      budget -= def.cost;
      newPlayerStructures.push({
        id: 'p_wall_' + Math.random().toString(36).substring(2, 9),
        type,
        team: 'player',
        x,
        y,
        width: 34,
        height: 34,
        hp: def.hp!,
        maxHp: def.hp!,
        cost: def.cost,
        spikeDamage: type === 'spike_wall' ? 20 : 0,
      });
    };

    const addPTurret = (x: number, y: number, type: TurretType) => {
      const def = TURRET_DEFS[type];
      if (budget < def.cost) return;
      budget -= def.cost;
      newPlayerStructures.push({
        id: 'p_turret_' + Math.random().toString(36).substring(2, 9),
        type,
        team: 'player',
        x,
        y,
        width: 44,
        height: 44,
        hp: def.hp!,
        maxHp: def.hp!,
        cost: def.cost,
        range: def.range!,
        attackPower: def.attack!,
        attackCooldown: 1.0,
        lastAttackTime: 0,
      });
    };

    const addPSoldier = (x: number, y: number, type: SoldierType, stance: SoldierStance) => {
      const def = SOLDIER_DEFS[type];
      if (budget < def.cost) return;
      budget -= def.cost;
      newPlayerSoldiers.push({
        id: 'p_sol_' + Math.random().toString(36).substring(2, 9),
        type,
        team: 'player',
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
        attackCooldown: 1.0,
        lastAttackTime: 0,
        targetId: null,
        targetType: null,
        siegeMultiplier: type === 'sapper' ? 3.5 : 1.0,
        cost: def.cost,
        kills: 0,
        facing: 0,
      });
    };

    if (preset === 'balanced') {
      for (let y = 140; y <= 240; y += 36) addPWall(360, y, 'stone_wall');
      for (let y = FIELD_HEIGHT - 240; y <= FIELD_HEIGHT - 140; y += 36) addPWall(360, y, 'stone_wall');
      addPTurret(310, 110, 'arrow_tower');
      addPTurret(310, FIELD_HEIGHT - 110, 'arrow_tower');
      addPTurret(180, FIELD_HEIGHT / 2, 'cannon_battery');
      addPSoldier(330, 200, 'samurai', 'defense');
      addPSoldier(330, FIELD_HEIGHT - 200, 'samurai', 'defense');
      addPSoldier(400, 280, 'sapper', 'attack');
      addPSoldier(400, FIELD_HEIGHT - 280, 'cavalry', 'attack');
      addPSoldier(280, FIELD_HEIGHT / 2 - 20, 'archer', 'hybrid');
    } else if (preset === 'artillery') {
      addPWall(370, 180, 'iron_wall');
      addPWall(370, FIELD_HEIGHT - 180, 'iron_wall');
      addPWall(180, FIELD_HEIGHT / 2 - 40, 'iron_wall');
      addPWall(180, FIELD_HEIGHT / 2 + 40, 'iron_wall');
      addPTurret(300, 120, 'cannon_battery');
      addPTurret(300, FIELD_HEIGHT - 120, 'cannon_battery');
      addPTurret(180, FIELD_HEIGHT / 2, 'catapult');
      addPSoldier(330, 200, 'samurai', 'defense');
      addPSoldier(330, FIELD_HEIGHT - 200, 'samurai', 'defense');
      addPSoldier(360, 325, 'archer', 'hybrid');
    } else {
      for (let y = 160; y <= 230; y += 40) addPWall(360, y, 'spike_wall');
      for (let y = FIELD_HEIGHT - 230; y <= FIELD_HEIGHT - 160; y += 40) addPWall(360, y, 'spike_wall');
      addPTurret(310, FIELD_HEIGHT / 2, 'fire_tower');
      addPSoldier(400, 180, 'cavalry', 'attack');
      addPSoldier(400, 240, 'cavalry', 'attack');
      addPSoldier(400, FIELD_HEIGHT - 180, 'cavalry', 'attack');
      addPSoldier(400, FIELD_HEIGHT - 240, 'cavalry', 'attack');
      addPSoldier(380, 310, 'sapper', 'attack');
      addPSoldier(380, FIELD_HEIGHT - 310, 'sapper', 'attack');
      addPSoldier(320, 200, 'archer', 'defense');
    }

    setPlayerBudget(budget);
    setStructures([...baseObjectives, ...newPlayerStructures, ...enemyStructures]);
    setSoldiers([...newPlayerSoldiers, ...enemySoldiers]);
    sounds.playPlace();
  };

  // Clear all player placed items
  const handleClearAll = () => {
    const baseObjectives = createInitialObjectives();
    const enemyStructures = structures.filter(s => s.team === 'enemy' && !s.isObjective);
    const enemySoldiers = soldiers.filter(s => s.team === 'enemy');

    setStructures([...baseObjectives, ...enemyStructures]);
    setSoldiers([...enemySoldiers]);
    setPlayerBudget(STARTING_BUDGET);
    setHasBomb(false);
    sounds.playPlace();
  };

  // Restart match with next AI strategy
  const handleRestart = () => {
    const nextStrategy = enemyStrategyIndex + 1;
    setEnemyStrategyIndex(nextStrategy);
    setPhase('build');
    setPlayerBudget(STARTING_BUDGET);
    setBuildTimeLeft(BUILD_TIME_LIMIT);
    setBattleTime(0);
    setBattleFunds(180);
    setWinner(null);
    setSelectedSoldierId(null);
    setHasBomb(false);
    setIsBombUsed(false);
    setIsBombTargeting(false);
    setTacticalBomb(null);
    setRespawnQueue([]);
    setProjectiles([]);
    setDamageNumbers([]);
    setParticles([]);
    setStats({
      wallsDestroyedByPlayer: 0,
      wallsDestroyedByEnemy: 0,
      soldiersKilledByPlayer: 0,
      soldiersKilledByEnemy: 0,
      damageDealtByPlayer: 0,
      damageDealtByEnemy: 0,
      winner: null,
    });

    const baseObjectives = createInitialObjectives();
    const enemySetup = generateEnemySetup(STARTING_BUDGET, nextStrategy);
    setStructures([...baseObjectives, ...enemySetup.structures]);
    setSoldiers(enemySetup.soldiers);
    setEnemyBattleFunds(Math.max(180, enemySetup.remainingFunds + 180));
    setEnemyHasBomb(enemySetup.hasBomb);
    setEnemyIsBombUsed(false);
    setEnemyStrategyName(enemySetup.strategyName);
    setEnemyOverallStance('defense');
    lastEnemyReinforceTimeRef.current = 0;
    lastEnemyTacticalCheckRef.current = 0;
  };

  const selectedSoldier = soldiers.find(s => s.id === selectedSoldierId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-2 sm:p-4 select-none font-sans">
      {/* Top Application Header */}
      <header className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-2 mb-2.5 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-amber-900/30">
            <Castle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-amber-400 tracking-wide">
                城塞防衛バトル
              </h1>
              <span className="text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                トップダウン2D攻城戦
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              2つの丸を落として本陣攻略！兵士は15秒で復活、3分時間切れ時は城砦合計体力で判定勝ち！
            </p>
          </div>
        </div>

        {/* Global Controls: Rules Guide & Sound */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-200 transition-colors shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            ルール手引き
          </button>

          <button
            type="button"
            onClick={() => setIsMuted(sounds.toggleMute())}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors"
            title={isMuted ? 'ミュート解除' : 'サウンド停止'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Arena Container */}
      <main className="w-full max-w-7xl space-y-2.5">
        {/* Battle HUD (Compact Status Bar on top of Canvas during Battle) */}
        {phase !== 'build' && (
          <BattleHUD
            structures={structures}
            soldiers={soldiers}
            respawnQueue={respawnQueue}
            battleTime={battleTime}
            gameSpeed={gameSpeed}
            setGameSpeed={setGameSpeed}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(sounds.toggleMute())}
            selectedSoldier={selectedSoldier}
            onChangeStance={handleChangeStance}
            onChangeAllStances={handleChangeAllStances}
            battleFunds={battleFunds}
            onSpawnReinforcement={handleSpawnReinforcement}
            hasBomb={hasBomb}
            isBombUsed={isBombUsed}
            isBombTargeting={isBombTargeting}
            onToggleBombTargeting={handleToggleBombTargeting}
            eventBanner={eventBanner}
            enemyBattleFunds={enemyBattleFunds}
            enemyHasBomb={enemyHasBomb}
            enemyIsBombUsed={enemyIsBombUsed}
            enemyStrategyName={enemyStrategyName}
            enemyOverallStance={enemyOverallStance}
          />
        )}

        {/* 2D Battle Canvas */}
        <BattleCanvas
          phase={phase}
          structures={structures}
          soldiers={soldiers}
          projectiles={projectiles}
          damageNumbers={damageNumbers}
          particles={particles}
          respawnQueue={respawnQueue}
          tacticalBomb={tacticalBomb}
          selectedItem={
            selectedCategory === 'wall'
              ? WALL_DEFS[selectedItemId as MaterialType]
              : selectedCategory === 'turret'
              ? TURRET_DEFS[selectedItemId as TurretType]
              : SOLDIER_DEFS[selectedItemId as SoldierType]
          }
          selectedStance={soldierStance}
          playerBudget={playerBudget}
          hoverPos={hoverPos}
          setHoverPos={setHoverPos}
          onCanvasClick={handleCanvasClick}
          onPlaceWallSegment={handlePlaceWallSegment}
          selectedSoldierId={selectedSoldierId}
          onSelectSoldier={setSelectedSoldierId}
          isBombTargeting={isBombTargeting}
          onDropBomb={handleDropBomb}
          gameTime={gameTimeRef.current}
        />

        {/* Build Panel (Active during Build Phase) */}
        {phase === 'build' && (
          <BuildPanel
            budget={playerBudget}
            maxBudget={STARTING_BUDGET}
            timeLeft={buildTimeLeft}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
            soldierStance={soldierStance}
            setSoldierStance={setSoldierStance}
            hasBomb={hasBomb}
            onBuyBomb={handleBuyBomb}
            onRefundBomb={handleRefundBomb}
            onApplyPreset={handleApplyPreset}
            onClearAll={handleClearAll}
            onStartBattle={startBattle}
            soldiers={soldiers}
            onChangeAllStances={handleChangeAllStances}
          />
        )}
      </main>

      {/* Result Modal when game ends */}
      {phase === 'ended' && winner && (
        <ResultModal
          winner={winner}
          stats={stats}
          battleTime={battleTime}
          onRestart={handleRestart}
        />
      )}

      {/* Rules & Strategy Guide Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
