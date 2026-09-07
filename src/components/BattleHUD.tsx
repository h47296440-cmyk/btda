import React from 'react';
import { Structure, Soldier, SoldierStance, Team, RespawnQueueItem } from '../types';
import { STANCE_INFO, SOLDIER_DEFS, BATTLE_TIME_LIMIT } from '../gameConfig';
import {
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  PlusCircle,
  Coins,
  Swords,
  Bomb,
  RotateCcw,
} from 'lucide-react';

interface BattleHUDProps {
  structures: Structure[];
  soldiers: Soldier[];
  respawnQueue: RespawnQueueItem[];
  battleTime: number;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  selectedSoldier: Soldier | null;
  onChangeStance: (soldierId: string, newStance: SoldierStance) => void;
  battleFunds: number;
  onSpawnReinforcement: (type: 'samurai' | 'archer' | 'sapper' | 'cavalry', stance: SoldierStance) => void;
  hasBomb: boolean;
  isBombUsed: boolean;
  isBombTargeting: boolean;
  onToggleBombTargeting: () => void;
  eventBanner: { message: string; team: Team; time: number } | null;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  structures,
  soldiers,
  respawnQueue,
  battleTime,
  gameSpeed,
  setGameSpeed,
  isPaused,
  setIsPaused,
  isMuted,
  onToggleMute,
  selectedSoldier,
  onChangeStance,
  battleFunds,
  onSpawnReinforcement,
  hasBomb,
  isBombUsed,
  isBombTargeting,
  onToggleBombTargeting,
  eventBanner,
}) => {
  // Player structures
  const playerHonjin = structures.find(s => s.team === 'player' && s.objectiveType === 'honjin');
  const playerMaru1 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_1');
  const playerMaru2 = structures.find(s => s.team === 'player' && s.objectiveType === 'maru_2');

  // Enemy structures
  const enemyHonjin = structures.find(s => s.team === 'enemy' && s.objectiveType === 'honjin');
  const enemyMaru1 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_1');
  const enemyMaru2 = structures.find(s => s.team === 'enemy' && s.objectiveType === 'maru_2');

  // Soldier counts & respawning counts
  const playerSoldiersCount = soldiers.filter(s => s.team === 'player' && s.hp > 0).length;
  const enemySoldiersCount = soldiers.filter(s => s.team === 'enemy' && s.hp > 0).length;
  const playerRespawningCount = respawnQueue.filter(r => r.team === 'player').length;
  const enemyRespawningCount = respawnQueue.filter(r => r.team === 'enemy').length;

  // Remaining time in 3-minute limit
  const remainingSeconds = Math.max(0, Math.ceil(BATTLE_TIME_LIMIT - battleTime));

  const renderMiniHp = (current: number, max: number, color: string = 'bg-blue-500') => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    return (
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-2">
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

      {/* COMPACT BATTLE HEADER BAR (Player vs Timer vs Enemy) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-lg">
        {/* PLAYER SIDE (Cols 1-4) */}
        <div className="md:col-span-5 bg-slate-800/60 rounded-lg p-2 border border-blue-900/40">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>自軍</span>
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

          {/* Maru 1 & Maru 2 indicators */}
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

        {/* CENTER TIME & CONTROLS (Cols 5-8) */}
        <div className="md:col-span-2 flex flex-col items-center justify-center py-1">
          <div className="text-[10px] text-slate-400">合戦制限時間 (判定)</div>
          <div
            className={`text-xl font-bold font-mono my-0.5 ${
              remainingSeconds <= 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {Math.floor(remainingSeconds / 60)
              .toString()
              .padStart(2, '0')}
            :
            {Math.floor(remainingSeconds % 60)
              .toString()
              .padStart(2, '0')}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`p-1 rounded text-xs border ${
                isPaused
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isPaused ? '再開' : '一時停止'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-0.5 border ${
                gameSpeed === 2
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <FastForward className="w-3 h-3" />
              {gameSpeed}x
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* ENEMY SIDE (Cols 9-12) */}
        <div className="md:col-span-5 bg-slate-800/60 rounded-lg p-2 border border-red-900/40">
          <div className="flex items-center justify-between text-xs mb-1">
            {enemyHonjin && (
              <span className="text-[11px] font-mono font-bold text-slate-200">
                本陣: {Math.max(0, enemyHonjin.hp)}
              </span>
            )}
            <div className="flex items-center gap-1.5 font-bold text-red-400">
              <span className="text-[10px] text-slate-400 font-normal">
                ({enemySoldiersCount}名{enemyRespawningCount > 0 ? ` +再出撃${enemyRespawningCount}` : ''})
              </span>
              <span>敵軍</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            </div>
          </div>

          {enemyHonjin &&
            renderMiniHp(
              enemyHonjin.hp,
              enemyHonjin.maxHp,
              enemyHonjin.isInvulnerable ? 'bg-slate-600' : 'bg-red-500'
            )}

          <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">二の丸:</span>
              <span className={`font-mono font-bold ${(enemyMaru1?.hp || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                {(enemyMaru1?.hp || 0) > 0 ? `${enemyMaru1?.hp}` : '破壊'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">三の丸:</span>
              <span className={`font-mono font-bold ${(enemyMaru2?.hp || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                {(enemyMaru2?.hp || 0) > 0 ? `${enemyMaru2?.hp}` : '破壊'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT TACTICAL ACTIONS BAR (Bomb, Reinforcements, Stance) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Tactical Bomb Trigger */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bomb className={`w-5 h-5 ${hasBomb && !isBombUsed ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
            <div>
              <div className="text-xs font-bold text-slate-100">決戦援護爆弾</div>
              <div className="text-[10px] text-slate-400">
                {isBombUsed
                  ? '使用済み'
                  : hasBomb
                  ? '所持中 (いつでも投下可能)'
                  : '未購入 (築城時に購入可)'}
              </div>
            </div>
          </div>

          {hasBomb && !isBombUsed && (
            <button
              type="button"
              onClick={onToggleBombTargeting}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isBombTargeting
                  ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-red-500/50 shadow'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-md'
              }`}
            >
              {isBombTargeting ? '投下キャンセル' : '💣 爆撃投下！'}
            </button>
          )}
        </div>

        {/* Reinforcements with Gold Funds */}
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

        {/* Selected Soldier Stance Switcher */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5">
          <div className="text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
            <span>🛡️ 兵士方針変更:</span>
            {selectedSoldier ? (
              <span className="text-[10px] text-amber-400 font-mono">
                HP:{selectedSoldier.hp} 撃破:{selectedSoldier.kills}
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-normal">兵士をクリックで選択</span>
            )}
          </div>

          {selectedSoldier ? (
            <div className="flex items-center gap-1">
              {(['defense', 'attack', 'hybrid'] as SoldierStance[]).map(st => {
                const info = STANCE_INFO[st];
                const active = selectedSoldier.stance === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onChangeStance(selectedSoldier.id, st)}
                    className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                      active
                        ? 'bg-slate-700 border-amber-400 text-white'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full text-[8px] flex items-center justify-center text-white"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.badge}
                    </span>
                    {info.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 truncate py-1">
              ※やられた兵士は15秒後に自陣から自動復活します
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
