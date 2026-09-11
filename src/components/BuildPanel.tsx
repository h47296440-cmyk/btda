import React from 'react';
import {
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  STANCE_INFO,
  BOMB_CONFIG,
  GAME_MODES,
} from '../gameConfig';
import { SoldierStance, Soldier, GameMode } from '../types';
import {
  Shield,
  Crosshair,
  Users,
  Coins,
  Clock,
  Sparkles,
  RotateCcw,
  Swords,
  Bomb,
  Check,
  Zap,
  Globe,
  Hammer,
} from 'lucide-react';

interface BuildPanelProps {
  budget: number;
  maxBudget: number;
  timeLeft: number;
  selectedCategory: 'wall' | 'turret' | 'soldier';
  setSelectedCategory: (cat: 'wall' | 'turret' | 'soldier') => void;
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
  soldierStance: SoldierStance;
  setSoldierStance: (stance: SoldierStance) => void;
  hasBomb: boolean;
  onBuyBomb: () => void;
  onRefundBomb: () => void;
  onApplyPreset: (preset: 'balanced' | 'artillery' | 'assault') => void;
  onClearAll: () => void;
  onStartBattle: () => void;
  soldiers?: Soldier[];
  onChangeAllStances?: (newStance: SoldierStance) => void;
  gameMode?: GameMode;
  onChangeGameMode?: (mode: GameMode) => void;
  cpuBuildProgress?: number; // 0 to 100
}

export const BuildPanel: React.FC<BuildPanelProps> = ({
  budget,
  maxBudget,
  timeLeft,
  selectedCategory,
  setSelectedCategory,
  selectedItemId,
  setSelectedItemId,
  soldierStance,
  setSoldierStance,
  hasBomb,
  onBuyBomb,
  onRefundBomb,
  onApplyPreset,
  onClearAll,
  onStartBattle,
  soldiers = [],
  onChangeAllStances,
  gameMode = '2_nations',
  onChangeGameMode,
  cpuBuildProgress = 50,
}) => {
  const playerSoldiers = soldiers.filter(s => s.team === 'player');
  const attackCount = playerSoldiers.filter(s => s.stance === 'attack').length;
  const defenseCount = playerSoldiers.filter(s => s.stance === 'defense').length;
  const hybridCount = playerSoldiers.filter(s => s.stance === 'hybrid').length;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 sm:p-4 shadow-xl space-y-3.5 text-slate-100">
      {/* MODE SELECTOR HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <Globe className="w-4 h-4 text-amber-400" />
          <span>合戦規模・参加国数選択:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: '2_nations', label: '🏯 2国決戦', desc: '通常' },
              { id: '4_nations', label: '⚔️ 4国大戦', desc: '敷地拡大・時間増' },
              { id: '8_nations', label: '🌐 8国天下統一', desc: '超大型・沼地＆氷原' },
            ] as const
          ).map(m => {
            const isSel = gameMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeGameMode && onChangeGameMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  isSel
                    ? 'bg-amber-600 text-white border-amber-300 shadow-md shadow-amber-600/30'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <span>{m.label}</span>
                <span className="ml-1 text-[10px] opacity-75 font-normal">({m.desc})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Header: Budget, Timer, and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Budget & Bomb Slot */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center space-x-2.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-amber-500/30">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">防衛・雇用予算</div>
              <div className="text-base font-bold text-amber-400">
                {Math.floor(budget)} <span className="text-[10px] text-slate-400 font-normal">/ {maxBudget} 金</span>
              </div>
            </div>
          </div>

          {/* Special Weapon: Tactical Bomb Slot */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              hasBomb
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            <Bomb className={`w-4 h-4 ${hasBomb ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold flex items-center gap-1">
                <span>{BOMB_CONFIG.name}</span>
                {hasBomb && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{BOMB_CONFIG.cost}金 (1発限定)</div>
            </div>
            {hasBomb ? (
              <button
                type="button"
                onClick={onRefundBomb}
                className="ml-1 px-2 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded text-[10px] font-bold border border-red-700"
              >
                返金
              </button>
            ) : (
              <button
                type="button"
                disabled={budget < BOMB_CONFIG.cost}
                onClick={onBuyBomb}
                className={`ml-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                  budget >= BOMB_CONFIG.cost
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow'
                    : 'bg-slate-700/50 text-slate-500 border-slate-600 cursor-not-allowed'
                }`}
              >
                購入
              </button>
            )}
          </div>
        </div>

        {/* Timer & Start Battle Action */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="w-4 h-4 text-blue-400" />
            <div className="text-xs text-slate-400">建築制限時間:</div>
            <div className={`font-mono font-bold text-sm ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <button
            type="button"
            onClick={onStartBattle}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold py-2 px-5 rounded-lg shadow-lg hover:shadow-red-500/20 transition-all border border-amber-400/50"
          >
            <Swords className="w-4 h-4" />
            <span>合戦開始！</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC CPU BUILDING PROGRESS DISPLAY */}
      <div className="bg-slate-800/60 border border-slate-700/70 rounded-lg p-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Hammer className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>敵国CPU築城リアルタイム進行中:</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">{Math.round(cpuBuildProgress)}% 完了</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-red-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, cpuBuildProgress))}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>※ CPUも予算・兵科・城壁を計算してリアルタイム建造しています</span>
          <span className="text-amber-300/80 font-medium">早く築城を完了しても「合戦開始」ですぐ完成表示されます</span>
        </div>
      </div>

      {/* Category Tabs: Walls, Turrets, Soldiers */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('wall');
              setSelectedItemId('wood_wall');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedCategory === 'wall'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>防壁・城壁</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('turret');
              setSelectedItemId('arrow_tower');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedCategory === 'turret'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>迎撃砲台・櫓</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('soldier');
              setSelectedItemId('samurai');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedCategory === 'soldier'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>守備兵・武士団</span>
          </button>
        </div>

        {/* Presets & Reset */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => onApplyPreset('balanced')}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center space-x-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>標準築城</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('artillery')}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center space-x-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>砲台重層</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('assault')}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center space-x-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>騎馬突撃</span>
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-300 px-2 py-1 rounded border border-red-800/60 flex items-center space-x-1 transition-colors ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>配置初期化</span>
          </button>
        </div>
      </div>

      {/* Item Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {selectedCategory === 'wall' &&
          Object.entries(WALL_DEFS).map(([id, def]) => {
            const isSelected = selectedItemId === id;
            const canAfford = budget >= def.cost;
            return (
              <div
                key={id}
                onClick={() => setSelectedItemId(id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                } ${!canAfford && !isSelected ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-xs text-slate-200">{def.name}</div>
                  <div className="text-amber-400 font-mono font-bold text-xs">{def.cost}金</div>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{def.description}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/60 pt-1">
                  <span>耐久: {def.hp}</span>
                  <div className="w-3.5 h-3.5 rounded border border-slate-600" style={{ backgroundColor: def.color || '#64748b' }} />
                </div>
              </div>
            );
          })}

        {selectedCategory === 'turret' &&
          Object.entries(TURRET_DEFS).map(([id, def]) => {
            const isSelected = selectedItemId === id;
            const canAfford = budget >= def.cost;
            return (
              <div
                key={id}
                onClick={() => setSelectedItemId(id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                } ${!canAfford && !isSelected ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-xs text-slate-200">{def.name}</div>
                  <div className="text-amber-400 font-mono font-bold text-xs">{def.cost}金</div>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{def.description}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/60 pt-1">
                  <span>攻撃: {def.attack}</span>
                  <span>射程: {def.range}</span>
                </div>
              </div>
            );
          })}

        {selectedCategory === 'soldier' &&
          Object.entries(SOLDIER_DEFS).map(([id, def]) => {
            const isSelected = selectedItemId === id;
            const canAfford = budget >= def.cost;
            return (
              <div
                key={id}
                onClick={() => setSelectedItemId(id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                } ${!canAfford && !isSelected ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-xs text-slate-200">{def.name}</div>
                  <div className="text-amber-400 font-mono font-bold text-xs">{def.cost}金</div>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{def.description}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/60 pt-1">
                  <span>HP: {def.hp}</span>
                  <span>攻: {def.attack}</span>
                  <span>速: {def.speed}</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Soldier Stance Selection */}
      {selectedCategory === 'soldier' && (
        <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 新規配置時の初期作戦設定:
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>現配置兵士:</span>
              <span className="text-red-400 font-bold">突撃 {attackCount}</span>
              <span className="text-blue-400 font-bold">防衛 {defenseCount}</span>
              <span className="text-emerald-400 font-bold">遊撃 {hybridCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['attack', 'defense', 'hybrid'] as const).map(stance => {
              const info = STANCE_INFO[stance];
              const isSelected = soldierStance === stance;
              return (
                <button
                  key={stance}
                  type="button"
                  onClick={() => setSoldierStance(stance)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-900/60 border-blue-400 shadow-md'
                      : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-[10px] flex items-center justify-center font-bold text-amber-300">
                      {info.badge}
                    </span>
                    <span>{info.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{info.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
