import React from 'react';
import { Structure, Soldier, SoldierStance, Team } from '../types';
import { STANCE_INFO, SOLDIER_DEFS } from '../gameConfig';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  PlusCircle,
  Coins,
  Swords,
} from 'lucide-react';
import { sounds } from '../audio';

interface BattleHUDProps {
  structures: Structure[];
  soldiers: Soldier[];
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
  eventBanner: { message: string; team: Team; time: number } | null;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  structures,
  soldiers,
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

  // Counts
  const playerSoldiersCount = soldiers.filter(s => s.team === 'player' && s.hp > 0).length;
  const enemySoldiersCount = soldiers.filter(s => s.team === 'enemy' && s.hp > 0).length;

  const renderHpBar = (current: number, max: number, color: string = 'bg-emerald-500') => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    return (
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Event Banner if Maru was destroyed or Honjin exposed */}
      {eventBanner && (
        <div
          className={`p-3 rounded-xl border text-center font-bold text-sm md:text-base animate-bounce shadow-xl flex items-center justify-center gap-2 ${
            eventBanner.team === 'player'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          <Swords className="w-5 h-5" />
          <span>{eventBanner.message}</span>
        </div>
      )}

      {/* Main Battle Status Overview (Player vs Enemy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        {/* PLAYER STATUS (Blue Side) */}
        <div className="bg-slate-900/90 border border-blue-600/40 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
              <span className="font-bold text-sm text-blue-400">自軍（プレイヤー）</span>
            </div>
            <span className="text-xs text-slate-400">生存兵士: {playerSoldiersCount}人</span>
          </div>

          <div className="space-y-2">
            {/* Honjin */}
            {playerHonjin && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-200">
                    <span>本陣</span>
                    {playerHonjin.isInvulnerable ? (
                      <span className="text-[10px] text-blue-400 flex items-center gap-0.5 bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-800">
                        <ShieldCheck className="w-3 h-3" /> 結界無敵
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-400 flex items-center gap-0.5 bg-red-950/70 px-1.5 py-0.2 rounded border border-red-800 animate-pulse">
                        <ShieldAlert className="w-3 h-3" /> 結界解除・危険！
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {Math.max(0, playerHonjin.hp)} / {playerHonjin.maxHp}
                  </span>
                </div>
                {renderHpBar(
                  playerHonjin.hp,
                  playerHonjin.maxHp,
                  playerHonjin.isInvulnerable ? 'bg-blue-500' : 'bg-red-500'
                )}
              </div>
            )}

            {/* Maru 1 & Maru 2 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {playerMaru1 && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>二の丸</span>
                    <span className="font-mono text-[10px]">
                      {playerMaru1.hp > 0 ? `${Math.max(0, playerMaru1.hp)}` : '陥落'}
                    </span>
                  </div>
                  {renderHpBar(playerMaru1.hp, playerMaru1.maxHp, playerMaru1.hp > 0 ? 'bg-sky-500' : 'bg-slate-700')}
                </div>
              )}
              {playerMaru2 && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>三の丸</span>
                    <span className="font-mono text-[10px]">
                      {playerMaru2.hp > 0 ? `${Math.max(0, playerMaru2.hp)}` : '陥落'}
                    </span>
                  </div>
                  {renderHpBar(playerMaru2.hp, playerMaru2.maxHp, playerMaru2.hp > 0 ? 'bg-sky-500' : 'bg-slate-700')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER CONTROLS (Time, Speed, Audio) */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 shadow-lg flex flex-col items-center justify-between text-center">
          <div className="text-xs text-slate-400 font-medium">合戦経過時間</div>
          <div className="text-2xl font-bold font-mono text-amber-400 my-1">
            {Math.floor(battleTime / 60)
              .toString()
              .padStart(2, '0')}
            :
            {Math.floor(battleTime % 60)
              .toString()
              .padStart(2, '0')}
          </div>

          {/* Quick battle controls */}
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                isPaused
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isPaused ? '再開' : '一時停止'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                gameSpeed === 2
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
              {gameSpeed}x 倍速
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 mt-2">
            ※ 敵の二の丸・三の丸を両方壊すと、敵本陣の結界が解除されます！
          </div>
        </div>

        {/* ENEMY STATUS (Red Side) */}
        <div className="bg-slate-900/90 border border-red-600/40 rounded-xl p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs text-slate-400">生存兵士: {enemySoldiersCount}人</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-red-400">敵軍（AI城塞）</span>
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Enemy Honjin */}
            {enemyHonjin && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-mono text-[11px]">
                    {Math.max(0, enemyHonjin.hp)} / {enemyHonjin.maxHp}
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-slate-200">
                    <span>本陣</span>
                    {enemyHonjin.isInvulnerable ? (
                      <span className="text-[10px] text-blue-400 flex items-center gap-0.5 bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-800">
                        <ShieldCheck className="w-3 h-3" /> 結界無敵
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-800 animate-pulse">
                        <ShieldAlert className="w-3 h-3" /> 結界解除・攻略好機！
                      </span>
                    )}
                  </div>
                </div>
                {renderHpBar(
                  enemyHonjin.hp,
                  enemyHonjin.maxHp,
                  enemyHonjin.isInvulnerable ? 'bg-slate-500' : 'bg-red-500'
                )}
              </div>
            )}

            {/* Enemy Maru 1 & Maru 2 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {enemyMaru1 && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>二の丸</span>
                    <span className="font-mono text-[10px]">
                      {enemyMaru1.hp > 0 ? `${Math.max(0, enemyMaru1.hp)}` : '陥落'}
                    </span>
                  </div>
                  {renderHpBar(enemyMaru1.hp, enemyMaru1.maxHp, enemyMaru1.hp > 0 ? 'bg-rose-500' : 'bg-slate-700')}
                </div>
              )}
              {enemyMaru2 && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>三の丸</span>
                    <span className="font-mono text-[10px]">
                      {enemyMaru2.hp > 0 ? `${Math.max(0, enemyMaru2.hp)}` : '陥落'}
                    </span>
                  </div>
                  {renderHpBar(enemyMaru2.hp, enemyMaru2.maxHp, enemyMaru2.hp > 0 ? 'bg-rose-500' : 'bg-slate-700')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Soldier Command & Realtime Reinforcement Dispatch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Selected Soldier Stance Switcher */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>🛡️ 選択中の自軍兵士の方針変更:</span>
            {selectedSoldier ? (
              <span className="text-[11px] text-amber-400 font-mono">
                HP: {selectedSoldier.hp}/{selectedSoldier.maxHp} | 撃破数: {selectedSoldier.kills}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal">
                戦場の兵士をクリックして選択
              </span>
            )}
          </div>

          {selectedSoldier ? (
            <div className="flex items-center gap-2">
              {(['defense', 'attack', 'hybrid'] as SoldierStance[]).map(st => {
                const info = STANCE_INFO[st];
                const active = selectedSoldier.stance === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onChangeStance(selectedSoldier.id, st)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-slate-700 border-amber-400 text-white shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
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
            <div className="text-xs text-slate-400 py-1 italic">
              戦場にいる自軍兵士をクリックすると、リアルタイムに「守り」「攻め」「ハイブリッド」の方針を変更できます。
            </div>
          )}
        </div>

        {/* Emergency Reinforcement Dispatch */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              増援兵士の出撃 (戦時軍資金)
            </span>
            <span className="text-amber-400 font-mono text-xs flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> {battleFunds} 金
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(['samurai', 'archer', 'sapper', 'cavalry'] as const).map(type => {
              const def = SOLDIER_DEFS[type];
              const canAfford = battleFunds >= def.cost;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onSpawnReinforcement(type, 'attack')}
                  className={`p-1.5 rounded-lg border text-center transition-all ${
                    canAfford
                      ? 'bg-slate-800 hover:bg-emerald-950 border-slate-700 hover:border-emerald-500 text-slate-200'
                      : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title={`${def.name}: ${def.cost}金`}
                >
                  <div className="text-[11px] font-bold truncate">{def.name.split('・')[0]}</div>
                  <div className="text-[10px] text-amber-400 font-mono">{def.cost}G</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
