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
  MaterialType,
  TurretType,
  SoldierType,
} from './types';
import {
  STARTING_BUDGET,
  BUILD_TIME_LIMIT,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
} from './gameConfig';
import {
  createInitialObjectives,
  generateEnemySetup,
  updateGameStep,
} from './gameEngine';
import { sounds } from './audio';
import { BattleCanvas } from './components/BattleCanvas';
import { BuildPanel } from './components/BuildPanel';
import { BattleHUD } from './components/BattleHUD';
import { ResultModal, HelpModal } from './components/GameModal';
import { Castle, HelpCircle, Volume2, VolumeX, Shield, Swords, Sparkles } from 'lucide-react';

export default function App() {
  // Game Phase
  const [phase, setPhase] = useState<GamePhase>('build');

  // Structures & Units
  const [structures, setStructures] = useState<Structure[]>(() => createInitialObjectives());
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Economics & Preparation
  const [playerBudget, setPlayerBudget] = useState<number>(STARTING_BUDGET);
  const [buildTimeLeft, setBuildTimeLeft] = useState<number>(BUILD_TIME_LIMIT);
  const [battleTime, setBattleTime] = useState<number>(0);
  const [battleFunds, setBattleFunds] = useState<number>(150);

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
  const [winner, setWinner] = useState<Team | null>(null);
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
    const enemySetup = generateEnemySetup(strategyIdx);
    setStructures(prev => {
      // Keep existing player structures & objectives, replace enemy defense
      const baseObjectives = createInitialObjectives();
      const playerPlaced = prev.filter(s => s.team === 'player' && !s.isObjective);
      return [...baseObjectives, ...playerPlaced, ...enemySetup.structures];
    });
    setSoldiers(prev => {
      const playerSoldiers = prev.filter(s => s.team === 'player');
      return [...playerSoldiers, ...enemySetup.soldiers];
    });
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
        setBattleTime(prev => prev + dt);

        // Passive battle funds generation (e.g. +3 Gold per second)
        setBattleFunds(prev => Math.min(600, prev + 3 * dt));

        setStructures(prevStructs => {
          setSoldiers(prevSoldiers => {
            const stepResult = updateGameStep(
              prevStructs,
              prevSoldiers,
              projectiles,
              damageNumbers,
              particles,
              stats,
              dt,
              gameTimeRef.current,
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
              }
            );

            // Sync visual buffers
            setProjectiles(stepResult.projectiles);
            setDamageNumbers(stepResult.damageNumbers);
            setParticles(stepResult.particles);
            setStats(stepResult.stats);

            // Check victory / defeat
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
  }, [phase, isPaused, gameSpeed, projectiles, damageNumbers, particles, stats]);

  // Handle Banner timeout
  useEffect(() => {
    if (!eventBanner) return;
    const t = setTimeout(() => {
      setEventBanner(null);
    }, 4500);
    return () => clearTimeout(t);
  }, [eventBanner]);

  // Click on Canvas
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

    // Otherwise, place new item if inside player build zone
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

      setPlayerBudget(b => b - def.cost);
      setStructures(prev => [
        ...prev,
        {
          id: 'player_wall_' + Math.random().toString(36).substring(2, 9),
          type: selectedItemId as MaterialType,
          team: 'player',
          x,
          y,
          width: 36,
          height: 36,
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
          facing: 0, // facing right toward enemy
        },
      ]);
      sounds.playPlace();
    }
  };

  // In-battle Emergency Reinforcement Spawn
  const handleSpawnReinforcement = (type: SoldierType, stance: SoldierStance) => {
    const def = SOLDIER_DEFS[type];
    if (battleFunds < def.cost) return;

    setBattleFunds(b => b - def.cost);
    // Spawn near player Honjin
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

  // Presets Application
  const handleApplyPreset = (preset: 'balanced' | 'artillery' | 'assault') => {
    // Clear existing player items
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
        width: 36,
        height: 36,
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
      // Front stone walls protecting Maru 1 & 2
      for (let y = 130; y <= 240; y += 38) addPWall(360, y, 'stone_wall');
      for (let y = FIELD_HEIGHT - 240; y <= FIELD_HEIGHT - 130; y += 38) addPWall(360, y, 'stone_wall');
      // Turrets
      addPTurret(310, 110, 'arrow_tower');
      addPTurret(310, FIELD_HEIGHT - 110, 'arrow_tower');
      addPTurret(180, FIELD_HEIGHT / 2, 'cannon_battery');
      // Army: Defense guards + Attack vanguard + Hybrid archers
      addPSoldier(330, 200, 'samurai', 'defense');
      addPSoldier(330, FIELD_HEIGHT - 200, 'samurai', 'defense');
      addPSoldier(400, 270, 'sapper', 'attack');
      addPSoldier(400, 370, 'cavalry', 'attack');
      addPSoldier(280, FIELD_HEIGHT / 2 - 30, 'archer', 'hybrid');
    } else if (preset === 'artillery') {
      // Iron walls & heavy cannon battery
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
      // Assault rush: Spikes + Cavalry & Sappers
      for (let y = 150; y <= 220; y += 45) addPWall(360, y, 'spike_wall');
      for (let y = FIELD_HEIGHT - 220; y <= FIELD_HEIGHT - 150; y += 45) addPWall(360, y, 'spike_wall');
      addPTurret(310, FIELD_HEIGHT / 2, 'fire_tower');
      addPSoldier(400, 160, 'cavalry', 'attack');
      addPSoldier(400, 230, 'cavalry', 'attack');
      addPSoldier(400, FIELD_HEIGHT - 160, 'cavalry', 'attack');
      addPSoldier(400, FIELD_HEIGHT - 230, 'cavalry', 'attack');
      addPSoldier(380, 300, 'sapper', 'attack');
      addPSoldier(380, 350, 'sapper', 'attack');
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
    setBattleFunds(150);
    setWinner(null);
    setSelectedSoldierId(null);
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

    // Reset base structures and generate enemy AI
    const baseObjectives = createInitialObjectives();
    const enemySetup = generateEnemySetup(nextStrategy);
    setStructures([...baseObjectives, ...enemySetup.structures]);
    setSoldiers(enemySetup.soldiers);
  };

  const selectedSoldier = soldiers.find(s => s.id === selectedSoldierId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 md:p-6 select-none font-sans">
      {/* Top Application Header */}
      <header className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900/90 border border-slate-800 px-5 py-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-amber-900/30">
            <Castle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black text-amber-400 tracking-wide">
                城塞防衛バトル
              </h1>
              <span className="text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                トップダウン2D攻城シミュレーション
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              制限時間＆予算内で城壁・砲台・兵士を配備し、2つの丸を落として本陣を撃破せよ！
            </p>
          </div>
        </div>

        {/* Global Controls: Rules Guide & Sound */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-200 transition-colors shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            ルール・戦術手引き
          </button>

          <button
            type="button"
            onClick={() => setIsMuted(sounds.toggleMute())}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors"
            title={isMuted ? 'ミュート解除' : 'サウンド停止'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Arena Container */}
      <main className="w-full max-w-7xl space-y-4">
        {/* Battle HUD (Active when in battle or ended) */}
        {phase !== 'build' && (
          <BattleHUD
            structures={structures}
            soldiers={soldiers}
            battleTime={battleTime}
            gameSpeed={gameSpeed}
            setGameSpeed={setGameSpeed}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(sounds.toggleMute())}
            selectedSoldier={selectedSoldier}
            onChangeStance={handleChangeStance}
            battleFunds={battleFunds}
            onSpawnReinforcement={handleSpawnReinforcement}
            eventBanner={eventBanner}
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
          selectedSoldierId={selectedSoldierId}
          onSelectSoldier={setSelectedSoldierId}
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
            onApplyPreset={handleApplyPreset}
            onClearAll={handleClearAll}
            onStartBattle={startBattle}
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
