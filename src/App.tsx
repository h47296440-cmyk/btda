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
  GameMode,
  RallyPoint,
} from './types';
import {
  GAME_MODES,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  BOMB_CONFIG,
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
  // Game Mode (2, 4, or 8 nations)
  const [gameMode, setGameMode] = useState<GameMode>('2_nations');
  const modeConfig = GAME_MODES[gameMode];

  // Game Phase
  const [phase, setPhase] = useState<GamePhase>('build');

  // Structures & Units
  const [structures, setStructures] = useState<Structure[]>(() => createInitialObjectives(modeConfig));
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [respawnQueue, setRespawnQueue] = useState<RespawnQueueItem[]>([]);

  // Progressive CPU construction cache
  const fullEnemyStructuresRef = useRef<Structure[]>([]);
  const fullEnemySoldiersRef = useRef<Soldier[]>([]);
  const currentCpuStructCountRef = useRef<number>(0);
  const currentCpuSoldierCountRef = useRef<number>(0);
  const [cpuBuildProgress, setCpuBuildProgress] = useState<number>(10);

  // Manual Movement Orders: Rally Point & Path Drawing
  const [rallyPoint, setRallyPoint] = useState<RallyPoint | null>(null);
  const [isRallyTargeting, setIsRallyTargeting] = useState<boolean>(false);
  const [isPathDrawing, setIsPathDrawing] = useState<boolean>(false);

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
  const [playerBudget, setPlayerBudget] = useState<number>(modeConfig.startingBudget);
  const [buildTimeLeft, setBuildTimeLeft] = useState<number>(modeConfig.buildTimeLimit);
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

  // References for game loop
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const gameTimeRef = useRef<number>(0);

  // Initialize Match for current game mode & strategy
  const initMatch = useCallback(
    (mode: GameMode, strategyIdx: number) => {
      const config = GAME_MODES[mode];
      setPhase('build');
      setPlayerBudget(config.startingBudget);
      setBuildTimeLeft(config.buildTimeLimit);
      setBattleTime(0);
      setBattleFunds(180);
      setWinner(null);
      setSelectedSoldierId(null);
      setHasBomb(false);
      setIsBombUsed(false);
      setIsBombTargeting(false);
      setRallyPoint(null);
      setIsRallyTargeting(false);
      setIsPathDrawing(false);
      setTacticalBomb(null);
      setRespawnQueue([]);
      setProjectiles([]);
      setDamageNumbers([]);
      setParticles([]);
      setCpuBuildProgress(8);
      currentCpuStructCountRef.current = 0;
      currentCpuSoldierCountRef.current = 0;

      setStats({
        wallsDestroyedByPlayer: 0,
        wallsDestroyedByEnemy: 0,
        soldiersKilledByPlayer: 0,
        soldiersKilledByEnemy: 0,
        damageDealtByPlayer: 0,
        damageDealtByEnemy: 0,
        winner: null,
      });

      // Base Objectives
      const baseObjectives = createInitialObjectives(config);

      // Procedurally generate complete setups for all opponent nations
      const allCpuStructures: Structure[] = [];
      const allCpuSoldiers: Soldier[] = [];
      let totalRemainingFunds = 0;
      let anyBomb = false;
      let mainStrategyName = '諸国布陣';

      config.nations.forEach((nation, idx) => {
        if (nation.isPlayer) return;

        const setup = generateEnemySetup({
          startingBudget: config.startingBudget,
          seed: (strategyIdx + idx) % 5,
          team: nation.id,
          basePos: nation.basePos,
          buildZone: nation.buildZone,
          fieldWidth: config.fieldWidth,
          fieldHeight: config.fieldHeight,
        });

        allCpuStructures.push(...setup.structures);
        allCpuSoldiers.push(...setup.soldiers);
        totalRemainingFunds += setup.remainingFunds;
        if (setup.hasBomb) anyBomb = true;
        if (idx === 1 || !mainStrategyName) {
          mainStrategyName = setup.strategyName;
        }
      });

      fullEnemyStructuresRef.current = allCpuStructures;
      fullEnemySoldiersRef.current = allCpuSoldiers;

      // Start with base objectives only
      setStructures(baseObjectives);
      setSoldiers([]);

      setEnemyBattleFunds(Math.max(180, Math.floor(totalRemainingFunds / Math.max(1, config.nations.length - 1)) + 180));
      setEnemyHasBomb(anyBomb);
      setEnemyIsBombUsed(false);
      setEnemyStrategyName(mainStrategyName);
      setEnemyOverallStance('defense');
      lastEnemyReinforceTimeRef.current = 0;
      lastEnemyTacticalCheckRef.current = 0;
    },
    []
  );

  // Initialize match on first mount or mode change
  useEffect(() => {
    initMatch(gameMode, enemyStrategyIndex);
  }, [gameMode, enemyStrategyIndex, initMatch]);

  // Progressive CPU building animation during build phase
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

        // Compute progressive CPU build completion percentage
        const totalDuration = modeConfig.buildTimeLimit;
        const elapsed = totalDuration - prev;
        const fraction = Math.min(1, Math.max(0.05, elapsed / totalDuration));
        setCpuBuildProgress(Math.round(fraction * 100));

        // Gradually reveal CPU structures and soldiers
        const targetStructCount = Math.floor(fraction * fullEnemyStructuresRef.current.length);
        const targetSoldierCount = Math.floor(fraction * fullEnemySoldiersRef.current.length);

        if (targetStructCount > currentCpuStructCountRef.current) {
          const newlyAdded = fullEnemyStructuresRef.current.slice(
            currentCpuStructCountRef.current,
            targetStructCount
          );
          currentCpuStructCountRef.current = targetStructCount;

          setStructures(current => {
            const baseAndPlayer = current.filter(s => s.team === 'player' || s.isObjective);
            const existingCpu = current.filter(s => s.team !== 'player' && !s.isObjective);
            return [...baseAndPlayer, ...existingCpu, ...newlyAdded];
          });

          // Sound and dust effect for construction
          sounds.playBuildHammer();
          if (newlyAdded.length > 0) {
            const sample = newlyAdded[0];
            setParticles(pts => [
              ...pts,
              {
                id: 'dust_' + Math.random(),
                x: sample.x,
                y: sample.y,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                color: '#d6d3d1',
                size: 5,
                life: 0.5,
                maxLife: 0.5,
              },
            ]);
          }
        }

        if (targetSoldierCount > currentCpuSoldierCountRef.current) {
          const newlyAdded = fullEnemySoldiersRef.current.slice(
            currentCpuSoldierCountRef.current,
            targetSoldierCount
          );
          currentCpuSoldierCountRef.current = targetSoldierCount;

          setSoldiers(current => {
            const playerUnits = current.filter(s => s.team === 'player');
            const existingCpu = current.filter(s => s.team !== 'player');
            return [...playerUnits, ...existingCpu, ...newlyAdded];
          });
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, modeConfig]);

  // Transition to Battle (flushes any remaining CPU items immediately)
  const startBattle = () => {
    // Reveal 100% of all enemy structures and soldiers immediately
    setStructures(current => {
      const baseAndPlayer = current.filter(s => s.team === 'player' || s.isObjective);
      return [...baseAndPlayer, ...fullEnemyStructuresRef.current];
    });
    setSoldiers(current => {
      const playerUnits = current.filter(s => s.team === 'player');
      return [...playerUnits, ...fullEnemySoldiersRef.current];
    });

    setCpuBuildProgress(100);
    setPhase('battle');
    sounds.playWarHorn();
    setEventBanner({
      message:
        gameMode === '8_nations'
          ? '🌐 8国大戦開戦！沼地と氷原を越え、敵対全城塞の本陣を攻め落とせ！'
          : gameMode === '4_nations'
          ? '⚔️ 4国大戦開戦！二の丸・三の丸を粉砕して各国の本陣を攻略せよ！'
          : '⚔️ 両軍出陣！まずは敵の「二の丸」「三の丸」を破壊せよ！',
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

      const dt = Math.min(0.08, rawDelta) * (isPaused ? 0 : gameSpeed);
      gameTimeRef.current += dt;

      if (!isPaused && dt > 0) {
        setBattleTime(prev => {
          const newTime = prev + dt;

          // Passive funds generation (+3 Gold/s)
          setBattleFunds(f => Math.min(800, f + 3 * dt));
          setEnemyBattleFunds(f => Math.min(800, f + 3 * dt));

          // 1. Enemy Tactical Bomb check
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

          // 2. Enemy Tactical Stance Evaluation (~3.5s)
          let tacticalCommand: ReturnType<typeof evaluateEnemyTacticalStance> = null;
          if (gameTimeRef.current - lastEnemyTacticalCheckRef.current >= 3.5) {
            lastEnemyTacticalCheckRef.current = gameTimeRef.current;
            tacticalCommand = evaluateEnemyTacticalStance(
              soldiers,
              structures,
              enemyOverallStance,
              newTime
            );
            if (tacticalCommand) {
              setEnemyOverallStance(tacticalCommand.overallStance);
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

          // 3. Enemy Reinforcements check
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
            const enemyNation = modeConfig.nations.find(n => !n.isPlayer) || modeConfig.nations[1];
            setEventBanner({
              message: enemySpawn.message,
              team: enemyNation.id,
              time: Date.now(),
            });
          }

          // 4. Update Game Step (Atomics: reinforcements + stance updates + simulation step)
          setStructures(prevStructs => {
            setSoldiers(prevSoldiers => {
              let updatedSoldiers = [...prevSoldiers];

              // Apply reinforcements atomically
              if (enemySpawn) {
                const enemyNation = modeConfig.nations.find(n => !n.isPlayer) || modeConfig.nations[1];
                const spawnX = enemyNation.basePos.honjin.x + (Math.random() * 60 - 30);
                const spawnY = enemyNation.basePos.honjin.y + (Math.random() * 60 - 30);
                const def = SOLDIER_DEFS[enemySpawn.type];
                updatedSoldiers.push({
                  id: 'enemy_reinforce_' + Math.random().toString(36).substring(2, 9),
                  type: enemySpawn.type,
                  team: enemyNation.id,
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
                });
              }

              // Apply tactical command atomically
              if (tacticalCommand) {
                const cmd = tacticalCommand;
                updatedSoldiers = updatedSoldiers.map(s => {
                  if (s.team === 'player') return s;
                  const matched = cmd.newStances.find(n => n.id === s.id);
                  return matched ? { ...s, stance: matched.stance } : s;
                });
              }

              const stepResult = updateGameStep(
                prevStructs,
                updatedSoldiers,
                projectiles,
                damageNumbers,
                particles,
                respawnQueue,
                tacticalBomb,
                stats,
                dt,
                gameTimeRef.current,
                newTime,
                // On Maru destroyed
                (team, maruType) => {
                  const isPlayerVictim = team === 'player';
                  setEventBanner({
                    message: isPlayerVictim
                      ? `⚠️ 自軍の【${maruType}】が陥落しました！`
                      : `💥 敵陣の【${maruType}】を粉砕！`,
                    team,
                    time: Date.now(),
                  });
                  sounds.playWallBreak();
                },
                // On Honjin exposed
                team => {
                  const isPlayerExposed = team === 'player';
                  setEventBanner({
                    message: isPlayerExposed
                      ? `🚨 警報！自陣の二の丸・三の丸が陥落！本陣の結界が消滅！`
                      : `🔥 好機！敵の二の丸・三の丸を撃破！敵本陣へ攻撃可能！`,
                    team,
                    time: Date.now(),
                  });
                  sounds.playWarHorn();
                },
                // Player bounty
                (_x, _y, bounty) => {
                  setBattleFunds(f => Math.min(800, f + bounty));
                },
                // Enemy bounty
                (_x, _y, bounty) => {
                  setEnemyBattleFunds(f => Math.min(800, f + bounty));
                },
                modeConfig.terrainZones,
                modeConfig.battleTimeLimit,
                modeConfig.fieldWidth,
                modeConfig.fieldHeight,
                rallyPoint
              );

              setProjectiles(stepResult.projectiles);
              setDamageNumbers(stepResult.damageNumbers);
              setParticles(stepResult.particles);
              setRespawnQueue(stepResult.respawnQueue);
              setTacticalBomb(stepResult.tacticalBomb);
              setStats(stepResult.stats);

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
  }, [
    phase,
    isPaused,
    gameSpeed,
    projectiles,
    damageNumbers,
    particles,
    respawnQueue,
    tacticalBomb,
    stats,
    modeConfig,
    rallyPoint,
  ]);

  // Handle Banner auto-hide
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

    const pZone = modeConfig.nations[0].buildZone;
    if (x < pZone.minX || x > pZone.maxX || y < pZone.minY || y > pZone.maxY) {
      return false;
    }

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

  // Click placement for structures
  const handlePlaceStructure = (x: number, y: number) => {
    if (phase !== 'build') return;
    const pZone = modeConfig.nations[0].buildZone;
    if (x < pZone.minX || x > pZone.maxX || y < pZone.minY || y > pZone.maxY) return;

    if (selectedCategory === 'wall') {
      const def = WALL_DEFS[selectedItemId as MaterialType];
      if (!def || playerBudget < def.cost) return;
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
          attackCooldown: 1.0,
          lastAttackTime: 0,
        },
      ]);
      sounds.playPlace();
    }
  };

  // Click placement for soldiers
  const handlePlaceSoldier = (x: number, y: number) => {
    if (phase !== 'build' || selectedCategory !== 'soldier') return;
    const pZone = modeConfig.nations[0].buildZone;
    if (x < pZone.minX || x > pZone.maxX || y < pZone.minY || y > pZone.maxY) return;

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
        attackCooldown: 1.0,
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
  };

  // Refund structure during build phase
  const handleRefundStructure = (id: string) => {
    const struct = structures.find(s => s.id === id);
    if (!struct || struct.team !== 'player' || struct.isObjective) return;

    setStructures(prev => prev.filter(s => s.id !== id));
    setPlayerBudget(b => Math.min(modeConfig.startingBudget, b + struct.cost));
    sounds.playPlace();
  };

  // Tactical Bomb controls
  const handleBuyBomb = () => {
    if (playerBudget < BOMB_CONFIG.cost || hasBomb) return;
    setPlayerBudget(b => b - BOMB_CONFIG.cost);
    setHasBomb(true);
    sounds.playPlace();
  };

  const handleRefundBomb = () => {
    if (!hasBomb || phase !== 'build') return;
    setHasBomb(false);
    setPlayerBudget(b => Math.min(modeConfig.startingBudget, b + BOMB_CONFIG.cost));
    sounds.playPlace();
  };

  const handleToggleBombTargeting = () => {
    if (!hasBomb || isBombUsed) return;
    setIsBombTargeting(prev => !prev);
    setIsRallyTargeting(false);
    setIsPathDrawing(false);
  };

  const handleDropBomb = (targetX: number, targetY: number) => {
    if (!hasBomb || isBombUsed) return;
    setIsBombTargeting(false);
    setIsBombUsed(true);

    setTacticalBomb({
      id: 'bomb_' + Date.now(),
      sourceTeam: 'player',
      targetX,
      targetY,
      startY: -80,
      currentY: -80,
      progress: 0,
      exploded: false,
    });

    sounds.playWarHorn();
    setEventBanner({
      message: `💥 援護爆弾投下！座標 (${Math.round(targetX)}, ${Math.round(targetY)}) を爆撃中！`,
      team: 'player',
      time: Date.now(),
    });
  };

  // MANUAL MOVEMENT: Rally Point (集合地点)
  const handleToggleRallyTargeting = () => {
    setIsRallyTargeting(prev => !prev);
    setIsBombTargeting(false);
    setIsPathDrawing(false);
  };

  const handleSetRallyPoint = (x: number, y: number) => {
    setRallyPoint({
      x,
      y,
      timestamp: Date.now(),
      active: true,
    });

    // Order all living player soldiers to move toward this beacon
    setSoldiers(sList =>
      sList.map(s => {
        if (s.team === 'player' && s.hp > 0) {
          return {
            ...s,
            rallyTarget: { x, y },
            waypointPath: undefined,
          };
        }
        return s;
      })
    );

    sounds.playRallyOrder();
    setEventBanner({
      message: `🚩【全軍集結命令】旗指図の地点へ向けて集結せよ！`,
      team: 'player',
      time: Date.now(),
    });
    setIsRallyTargeting(false);
  };

  const handleClearRallyPoint = () => {
    setRallyPoint(null);
    setSoldiers(sList =>
      sList.map(s => {
        if (s.team === 'player') {
          return { ...s, rallyTarget: null };
        }
        return s;
      })
    );
    setEventBanner({
      message: '全軍集結命令を解除しました。通常索敵へ復帰します。',
      team: 'player',
      time: Date.now(),
    });
  };

  // MANUAL MOVEMENT: Path Drawing (進軍路なぞり)
  const handleTogglePathDrawing = () => {
    setIsPathDrawing(prev => !prev);
    setIsBombTargeting(false);
    setIsRallyTargeting(false);
  };

  const handlePathDrawn = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return;

    setSoldiers(sList =>
      sList.map(s => {
        if (s.team === 'player' && s.hp > 0) {
          return {
            ...s,
            waypointPath: [...points],
            rallyTarget: null,
          };
        }
        return s;
      })
    );

    sounds.playPathDraw();
    setEventBanner({
      message: `✍️【進軍路突撃】描いた進撃ルートへ向けて突進開始！`,
      team: 'player',
      time: Date.now(),
    });
    setIsPathDrawing(false);
  };

  // In-battle Emergency Reinforcements
  const handleSpawnReinforcement = (type: SoldierType, stance: SoldierStance) => {
    const def = SOLDIER_DEFS[type];
    if (battleFunds < def.cost) return;

    setBattleFunds(f => f - def.cost);
    const pZone = modeConfig.nations[0].buildZone;
    const spawnX = pZone.minX + 80 + Math.random() * 40;
    const spawnY = (pZone.minY + pZone.maxY) / 2 + (Math.random() * 80 - 40);

    setSoldiers(prev => [
      ...prev,
      {
        id: 'reinforce_' + Math.random().toString(36).substring(2, 9),
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
        attackCooldown: 1.0,
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

  // Change individual soldier stance
  const handleChangeStance = (soldierId: string, newStance: SoldierStance) => {
    setSoldiers(prev => prev.map(s => (s.id === soldierId ? { ...s, stance: newStance } : s)));
  };

  // Change all friendly soldiers' stances
  const handleChangeAllStances = (newStance: SoldierStance) => {
    setSoldiers(prev => prev.map(s => (s.team === 'player' ? { ...s, stance: newStance } : s)));
    sounds.playWarHorn();
  };

  // Apply Presets
  const handleApplyPreset = (preset: 'balanced' | 'artillery' | 'assault') => {
    const baseObjectives = createInitialObjectives(modeConfig);
    const enemyStructures = structures.filter(s => s.team !== 'player' && !s.isObjective);
    const enemySoldiers = soldiers.filter(s => s.team !== 'player');

    let budget = modeConfig.startingBudget;
    const newPlayerStructures: Structure[] = [];
    const newPlayerSoldiers: Soldier[] = [];

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

    const pZone = modeConfig.nations[0].buildZone;
    const midX = (pZone.minX + pZone.maxX) / 2;
    const midY = (pZone.minY + pZone.maxY) / 2;

    if (preset === 'balanced') {
      for (let y = midY - 140; y <= midY - 40; y += 36) addPWall(midX + 60, y, 'stone_wall');
      for (let y = midY + 40; y <= midY + 140; y += 36) addPWall(midX + 60, y, 'stone_wall');
      addPTurret(midX + 20, midY - 100, 'arrow_tower');
      addPTurret(midX + 20, midY + 100, 'arrow_tower');
      addPTurret(midX - 60, midY, 'cannon_battery');
      addPSoldier(midX + 40, midY - 60, 'samurai', 'defense');
      addPSoldier(midX + 40, midY + 60, 'samurai', 'defense');
      addPSoldier(midX + 90, midY - 30, 'sapper', 'attack');
      addPSoldier(midX + 90, midY + 30, 'cavalry', 'attack');
      addPSoldier(midX, midY, 'archer', 'hybrid');
    } else if (preset === 'artillery') {
      addPWall(midX + 70, midY - 80, 'iron_wall');
      addPWall(midX + 70, midY + 80, 'iron_wall');
      addPTurret(midX + 20, midY - 80, 'cannon_battery');
      addPTurret(midX + 20, midY + 80, 'cannon_battery');
      addPTurret(midX - 60, midY, 'catapult');
      addPSoldier(midX + 30, midY - 40, 'samurai', 'defense');
      addPSoldier(midX + 30, midY + 40, 'samurai', 'defense');
      addPSoldier(midX + 60, midY, 'archer', 'hybrid');
    } else {
      for (let y = midY - 120; y <= midY + 120; y += 40) addPWall(midX + 70, y, 'spike_wall');
      addPTurret(midX + 20, midY, 'fire_tower');
      addPSoldier(midX + 100, midY - 60, 'cavalry', 'attack');
      addPSoldier(midX + 100, midY + 60, 'cavalry', 'attack');
      addPSoldier(midX + 90, midY, 'sapper', 'attack');
      addPSoldier(midX + 30, midY, 'archer', 'defense');
    }

    setPlayerBudget(budget);
    setStructures([...baseObjectives, ...newPlayerStructures, ...enemyStructures]);
    setSoldiers([...newPlayerSoldiers, ...enemySoldiers]);
    sounds.playPlace();
  };

  // Clear all player placed items
  const handleClearAll = () => {
    const baseObjectives = createInitialObjectives(modeConfig);
    const enemyStructures = structures.filter(s => s.team !== 'player' && !s.isObjective);
    const enemySoldiers = soldiers.filter(s => s.team !== 'player');

    setStructures([...baseObjectives, ...enemyStructures]);
    setSoldiers([...enemySoldiers]);
    setPlayerBudget(modeConfig.startingBudget);
    setHasBomb(false);
    sounds.playPlace();
  };

  // Switch game mode
  const handleChangeGameMode = (newMode: GameMode) => {
    setGameMode(newMode);
    initMatch(newMode, enemyStrategyIndex);
  };

  // Restart match
  const handleRestart = () => {
    const nextStrategy = enemyStrategyIndex + 1;
    setEnemyStrategyIndex(nextStrategy);
    initMatch(gameMode, nextStrategy);
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
                {modeConfig.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              敷地拡大・時間倍増の多国モード、集合旗・進軍路なぞり指揮、泥沼＆氷原地帯対応の本格合戦！
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
        {/* Battle HUD */}
        {phase !== 'build' && (
          <BattleHUD
            structures={structures}
            soldiers={soldiers}
            respawnQueue={respawnQueue}
            battleTime={battleTime}
            battleTimeLimit={modeConfig.battleTimeLimit}
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
            gameMode={gameMode}
            rallyPoint={rallyPoint}
            isRallyTargeting={isRallyTargeting}
            onToggleRallyTargeting={handleToggleRallyTargeting}
            onClearRallyPoint={handleClearRallyPoint}
            isPathDrawing={isPathDrawing}
            onTogglePathDrawing={handleTogglePathDrawing}
            terrainZones={modeConfig.terrainZones}
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
          onPlaceStructure={handlePlaceStructure}
          onPlaceWallSegment={handlePlaceWallSegment}
          onPlaceSoldier={handlePlaceSoldier}
          onSelectSoldier={setSelectedSoldierId}
          onRefundStructure={handleRefundStructure}
          onDropBomb={handleDropBomb}
          selectedSoldierId={selectedSoldierId}
          isBombTargeting={isBombTargeting}
          gameTime={gameTimeRef.current}
          gameMode={gameMode}
          modeConfig={modeConfig}
          terrainZones={modeConfig.terrainZones}
          fieldWidth={modeConfig.fieldWidth}
          fieldHeight={modeConfig.fieldHeight}
          playerBuildZone={modeConfig.nations[0].buildZone}
          rallyPoint={rallyPoint}
          onSetRallyPoint={handleSetRallyPoint}
          isRallyTargeting={isRallyTargeting}
          isPathDrawing={isPathDrawing}
          onPathDrawn={handlePathDrawn}
        />

        {/* Build Panel (Active during Build Phase) */}
        {phase === 'build' && (
          <BuildPanel
            budget={playerBudget}
            maxBudget={modeConfig.startingBudget}
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
            gameMode={gameMode}
            onChangeGameMode={handleChangeGameMode}
            cpuBuildProgress={cpuBuildProgress}
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
