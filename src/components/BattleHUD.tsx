import React from 'react';
import { Structure, Soldier, SoldierStance, Team, RespawnQueueItem, GameMode, RallyPoint, TerrainZone } from '../types';
import { STANCE_INFO, SOLDIER_DEFS } from '../gameConfig';
import { NATION_THEMES } from './BattleCanvas';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  PlusCircle,
  Coins,
  Swords,
  Bomb,
  Flag,
  PenTool,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface BattleHUDProps {
  structures: Structure[];
  soldiers: Soldier[];
  respawnQueue: RespawnQueueItem[];
  battleTime: number;
  battleTimeLimit?: number;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  selectedSoldier: Soldier | null;
  onChangeStance: (soldierId: string, newStance: SoldierStance) => void;
  onChangeAllStances: (newStance: SoldierStance) => void;
  battleFunds: number;
  onSpawnReinforcement: (type: 'samurai' | 'archer' | 'sapper' | 'cavalry', stance: SoldierStance) => void;
  hasBomb: boolean;
  isBombUsed: boolean;
  isBombTargeting: boolean;
  onToggleBombTargeting: () => void;
  eventBanner: { message: string; team: Team; time: number } | null;
  enemyBattleFunds?: number;
  enemyHasBomb?: boolean;
  enemyIsBombUsed?: boolean;
  enemyStrategyName?: string;
  enemyOverallStance?: SoldierStance;

  // New tactical manual movement & multi-nation props
  gameMode?: GameMode;
  rallyPoint?: RallyPoint | null;
  isRallyTargeting?: boolean;
  onToggleRallyTargeting?: () => void;
  onClearRallyPoint?: () => void;
  isPathDrawing?: boolean;
  onTogglePathDrawing?: () => void;
  terrainZones?: TerrainZone[];
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  structures,
  soldiers,
  respawnQueue,
  battleTime,
  battleTimeLimit = 180,
  gameSpeed,
  setGameSpeed,
  isPaused,
  setIsPaused,
  isMuted,
  onToggleMute,
  selectedSoldier,
  onChangeStance,
  onChangeAllStances,
  battleFunds,
  onSpawnReinforcement,
  hasBomb,
  isBombUsed,
  isBombTargeting,
  onToggleBombTargeting,
  eventBanner,
  enemyBattleFunds = 0,
  enemyHasBomb = true,
  enemyIsBombUsed = false,
  enemyStrategyName = '敵将陣形',
  enemyOverallStance = 'defense',
  gameMode = '2_nations',
  rallyPoint = null,
  isRallyTargeting = false,
  onToggleRallyTargeting,
  onClearRallyPoint,
  isPathDrawing = false,
  onTogglePathDrawing,
  terrainZones = [],
}) => {
  // Living player soldiers stats for command
  const livingPlayerSoldiers = soldiers.filter(s => s.team === 'player' && s.hp > 0);
  const playerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');
  const playerMaru1 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_1');
  const playerMaru2 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_2');

  const playerSoldiersCount = livingPlayerSoldiers.length;
  const playerRespawningCount = respawnQueue.filter(r => r.team === 'player').length;

  // Distinct enemy teams
  const enemyTeams: Team[] = Array.from(new Set(structures.map(s => s.team))).filter(
    (t): t is Team => t !== 'player'
  );

  // Remaining battle time
  const remainingSeconds = Math.max(0, Math.ceil(battleTimeLimit - battleTime));

  const renderMiniHp = (current: number, max: number, color: string = 'bg-blue-500') => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    return (
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Event Banner */}
      {eventBanner && (
        <div
          className={`py-1.5 px-3 rounded-lg border text-center font-bold text-xs sm:text-sm animate-bounce shadow-md flex items-center justify-center gap-2 ${
            eventBanner.team === 'player'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>{eventBanner.message}</span>
        </div>
      )}

      {/* COMPACT BATTLE HEADER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-lg">
        {/* PLAYER SIDE */}
        <div className="md:col-span-5 bg-slate-800/70 rounded-lg p-2.5 border border-blue-900/50">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>自軍 (蒼龍)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({playerSoldiersCount}名{playerRespawningCount > 0 ? ` +再出撃${playerRespawningCount}` : ''})
              </span>
            </div>
            {playerHonjin && (
              <span className="text-[11px] font-mono font-bold text-slate-200">
                本陣: {Math.max(0, playerHonjin.hp)}
              </span>
            )}
          </div>

          {playerHonjin &&
            renderMiniHp(
              playerHonjin.hp,
              playerHonjin.maxHp,
              playerHonjin.isInvulnerable ? 'bg-blue-500' : 'bg-red-500'
            )}

          {/* Maru 1 & Maru 2 */}
          <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">二の丸:</span>
              <span className={`font-mono font-bold ${(playerMaru1?.hp || 0) > 0 ? 'text-sky-300' : 'text-slate-500'}`}>
                {(playerMaru1?.hp || 0) > 0 ? `${playerMaru1?.hp}` : '破壊'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">三の丸:</span>
              <span className={`font-mono font-bold ${(playerMaru2?.hp || 0) > 0 ? 'text-sky-300' : 'text-slate-500'}`}>
                {(playerMaru2?.hp || 0) > 0 ? `${playerMaru2?.hp}` : '破壊'}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: TIME & CONTROLS */}
        <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-800/80 rounded-lg p-2 border border-slate-700">
          <div className="text-[10px] text-slate-400 font-medium">合戦制限時間</div>
          <div
            className={`font-mono font-bold text-base tracking-wider ${
              remainingSeconds <= 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title={isPaused ? '再開' : '一時停止'}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                gameSpeed === 2 ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              {gameSpeed}x
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* ENEMY SIDES */}
        <div className="md:col-span-5 bg-slate-800/70 rounded-lg p-2.5 border border-red-900/50">
          {enemyTeams.length === 1 ? (
            // Single Enemy (2-nations)
            (() => {
              const eTeam = enemyTeams[0];
              const eHonjin = structures.find(s => s.team === eTeam && s.objectiveType === 'honjin');
              const eMaru1 = structures.find(s => s.team === eTeam && s.objectiveType === 'maru_1');
              const eMaru2 = structures.find(s => s.team === eTeam && s.objectiveType === 'maru_2');
              const eSols = soldiers.filter(s => s.team === eTeam && s.hp > 0).length;

              return (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-red-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span>敵軍 (紅蓮)</span>
                      <span className="text-[10px] text-slate-400 font-normal">({eSols}名)</span>
                    </div>
                    {eHonjin && (
                      <span className="text-[11px] font-mono font-bold text-slate-200">
                        本陣: {Math.max(0, eHonjin.hp)}
                      </span>
                    )}
                  </div>

                  {eHonjin &&
                    renderMiniHp(
                      eHonjin.hp,
                      eHonjin.maxHp,
                      eHonjin.isInvulnerable ? 'bg-slate-600' : 'bg-red-500'
                    )}

                  <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">二の丸:</span>
                      <span className={`font-mono font-bold ${(eMaru1?.hp || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                        {(eMaru1?.hp || 0) > 0 ? `${eMaru1?.hp}` : '破壊'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">三の丸:</span>
                      <span className={`font-mono font-bold ${(eMaru2?.hp || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                        {(eMaru2?.hp || 0) > 0 ? `${eMaru2?.hp}` : '破壊'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // Multi-Enemies (4 or 8 nations)
            <div>
              <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                <span>⚔️ 敵対諸国状況 ({enemyTeams.length}カ国)</span>
                <span className="text-[9px] text-slate-400">全本陣撃破で天下統一！</span>
              </div>
              <div className={`grid ${enemyTeams.length <= 4 ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 max-h-[85px] overflow-y-auto`}>
                {enemyTeams.map(eTeam => {
                  const theme = NATION_THEMES[eTeam] || NATION_THEMES['enemy'];
                  const eHonjin = structures.find(s => s.team === eTeam && s.objectiveType === 'honjin');
                  const isFallen = !eHonjin || eHonjin.hp <= 0;
                  const eSols = soldiers.filter(s => s.team === eTeam && s.hp > 0).length;

                  return (
                    <div
                      key={eTeam}
                      className={`p-1 rounded border text-[10px] ${
                        isFallen
                          ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span style={{ color: theme.border }}>{theme.kanji}</span>
                        <span className="font-mono text-[9px]">{isFallen ? '陥落' : `${eHonjin.hp}`}</span>
                      </div>
                      <div className="text-[8px] text-slate-400 truncate">{eSols}名</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Strategy & Resource Status */}
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-700/50 text-[10px]">
            <div className="flex items-center gap-1.5 truncate max-w-[170px]">
              <span className="text-amber-300/90 font-medium truncate" title={enemyStrategyName}>
                ⚔️ {enemyStrategyName}
              </span>
              <span
                className={`px-1 py-0.2 text-[9px] rounded font-bold ${
                  enemyOverallStance === 'attack'
                    ? 'bg-red-950 text-red-300 border border-red-700'
                    : enemyOverallStance === 'defense'
                    ? 'bg-blue-950 text-blue-300 border border-blue-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}
              >
                {enemyOverallStance === 'attack' ? '突撃中' : enemyOverallStance === 'defense' ? '防衛中' : '遊撃中'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-amber-400 font-bold">💰 {Math.floor(enemyBattleFunds)}G</span>
              <span className={enemyIsBombUsed ? 'text-slate-500' : enemyHasBomb ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                💣 {enemyIsBombUsed ? '投下済' : enemyHasBomb ? '装填中' : 'なし'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TACTICAL COMMAND BAR: BOMB, REINFORCEMENTS, STANCES, & MANUAL MOVEMENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* 1. MANUAL UNIT MOVEMENT ORDERS (集合 & なぞり進軍路) */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 space-y-1.5">
          <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
            <span>🚩 兵士直接指揮・進軍指示</span>
            {rallyPoint?.active && (
              <button
                type="button"
                onClick={onClearRallyPoint}
                className="text-[9px] text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5"
              >
                <XCircle className="w-3 h-3" /> 解除
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* Rally Point Toggle */}
            <button
              type="button"
              onClick={onToggleRallyTargeting}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                isRallyTargeting
                  ? 'bg-amber-600 text-white border-amber-300 animate-pulse shadow-amber-500/50 shadow'
                  : rallyPoint?.active
                  ? 'bg-amber-950/70 border-amber-600 text-amber-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRallyTargeting ? '地点選択中' : '集合地点'}</span>
            </button>

            {/* Path Drawing Toggle */}
            <button
              type="button"
              onClick={onTogglePathDrawing}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                isPathDrawing
                  ? 'bg-sky-600 text-white border-sky-300 animate-pulse shadow-sky-500/50 shadow'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-sky-400" />
              <span>{isPathDrawing ? 'なぞり中' : '進軍路なぞり'}</span>
            </button>
          </div>

          <div className="text-[9px] text-slate-400 leading-tight">
            {isRallyTargeting
              ? '★ 地図上をクリックして旗を立てると兵士が集まります'
              : isPathDrawing
              ? '★ 地図上をドラッグして線をなぞると兵士が進軍します'
              : '集合旗または進軍線で全兵士を狙撃・迂回誘導できます'}
          </div>
        </div>

        {/* 2. Tactical Bomb Trigger */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bomb className={`w-4 h-4 ${hasBomb && !isBombUsed ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
              <span className="text-xs font-bold text-slate-100">決戦援護爆弾</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {isBombUsed ? '使用済' : hasBomb ? '所持中' : '未購入'}
            </span>
          </div>

          {hasBomb && !isBombUsed ? (
            <button
              type="button"
              onClick={onToggleBombTargeting}
              className={`mt-2 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                isBombTargeting
                  ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-red-500/50 shadow'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-md'
              }`}
            >
              {isBombTargeting ? '投下キャンセル' : '💣 爆撃投下目標を指定！'}
            </button>
          ) : (
            <div className="text-[10px] text-slate-500 mt-2">
              {isBombUsed ? 'この合戦では投下完了しました' : '築城フェーズで購入可能'}
            </div>
          )}
        </div>

        {/* 3. Reinforcements with Gold Funds */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
            <span className="flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              緊急増援
            </span>
            <span className="text-amber-400 font-mono text-xs flex items-center gap-1">
              <Coins className="w-3 h-3" /> {Math.floor(battleFunds)} 金
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(['samurai', 'archer', 'sapper', 'cavalry'] as const).map(type => {
              const def = SOLDIER_DEFS[type];
              const canAfford = Math.floor(battleFunds) >= def.cost;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onSpawnReinforcement(type, 'attack')}
                  className={`py-1 px-1 rounded border text-center transition-all ${
                    canAfford
                      ? 'bg-slate-800 hover:bg-emerald-950 border-slate-700 hover:border-emerald-500 text-slate-200'
                      : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title={`${def.name}: ${def.cost}金`}
                >
                  <div className="text-[10px] font-bold truncate">{def.name.split('・')[0]}</div>
                  <div className="text-[9px] text-amber-400 font-mono">{def.cost}G</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Batch All Soldiers Stance Command */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 space-y-1.5">
          <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
            <span>⚔️ 全軍号令 (一括変更)</span>
            <span className="text-[10px] text-slate-400 font-mono">{livingPlayerSoldiers.length}名</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onChangeAllStances('attack')}
              className="py-1 px-1 bg-red-950/70 hover:bg-red-900 border border-red-600/80 text-red-200 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-[9px] flex items-center justify-center text-white font-bold">
                攻
              </span>
              <span>突撃</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeAllStances('defense')}
              className="py-1 px-1 bg-blue-950/70 hover:bg-blue-900 border border-blue-600/80 text-blue-200 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-[9px] flex items-center justify-center text-white font-bold">
                防
              </span>
              <span>防衛</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeAllStances('hybrid')}
              className="py-1 px-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-200 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-[9px] flex items-center justify-center text-white font-bold">
                遊
              </span>
              <span>遊撃</span>
            </button>
          </div>

          {/* Terrain Hazard Badges if present */}
          {terrainZones.length > 0 && (
            <div className="pt-1 border-t border-slate-800 flex items-center gap-2 text-[9px] text-slate-400">
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> 地形:
              </span>
              <span className="text-amber-200">沼地(減速)</span>
              <span className="text-sky-200">氷原(加速)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
