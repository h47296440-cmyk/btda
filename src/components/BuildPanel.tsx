import React from 'react';
import {
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  STANCE_INFO,
  BOMB_CONFIG,
} from '../gameConfig';
import { SoldierStance, Soldier } from '../types';
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
}) => {
  const playerSoldiers = soldiers.filter(s => s.team === 'player');
  const attackCount = playerSoldiers.filter(s => s.stance === 'attack').length;
  const defenseCount = playerSoldiers.filter(s => s.stance === 'defense').length;
  const hybridCount = playerSoldiers.filter(s => s.stance === 'hybrid').length;
  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 sm:p-4 shadow-xl space-y-3.5 text-slate-100">
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

        {/* Countdown Timer & Start */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
            <div>
              <div className="text-[10px] text-slate-400">築城制限時間</div>
              <div className={`text-base font-bold font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-slate-100'}`}>
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>
            </div>
          </div>

          <div className="dropdown relative group">
            <button
              type="button"
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors text-slate-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              おすすめ配置
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-30">
              <button
                type="button"
                onClick={() => onApplyPreset('balanced')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 text-slate-200"
              >
                🏯 バランス要塞 (石垣+矢倉+兵士)
              </button>
              <button
                type="button"
                onClick={() => onApplyPreset('artillery')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 text-slate-200"
              >
                💣 大砲鉄壁型 (大筒+鉄壁防備)
              </button>
              <button
                type="button"
                onClick={() => onApplyPreset('assault')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 text-slate-200"
              >
                ⚡ 電撃突撃隊 (騎馬+破城兵速攻)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-2 bg-slate-800/80 hover:bg-red-950/60 border border-slate-700 hover:border-red-600 rounded-lg text-xs text-slate-300 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            全撤去
          </button>

          <button
            type="button"
            onClick={onStartBattle}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-bold text-white rounded-lg shadow-lg shadow-red-900/30 flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
          >
            <Swords className="w-4 h-4" />
            出陣！合戦開始
          </button>
        </div>
      </div>

      {/* Main Category Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('wall');
            setSelectedItemId('wood_wall');
          }}
          className={`py-2 px-2 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-colors border ${
            selectedCategory === 'wall'
              ? 'bg-amber-600/30 text-amber-300 border-amber-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span>防壁素材 <span className="text-[10px] text-amber-300 font-normal">✍️なぞり可</span></span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('turret');
            setSelectedItemId('arrow_tower');
          }}
          className={`py-2 px-2 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-colors border ${
            selectedCategory === 'turret'
              ? 'bg-blue-600/30 text-blue-300 border-blue-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Crosshair className="w-4 h-4 text-blue-400" />
          <span>迎撃砲台 <span className="text-[10px] text-blue-300 font-normal">👆1クリック</span></span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('soldier');
            setSelectedItemId('samurai');
          }}
          className={`py-2 px-2 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-colors border ${
            selectedCategory === 'soldier'
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>出撃兵士 <span className="text-[10px] text-emerald-300 font-normal">👆1クリック</span></span>
        </button>
      </div>

      {/* Category Items List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {selectedCategory === 'wall' &&
          Object.values(WALL_DEFS).map(item => {
            const isSelected = selectedItemId === item.id;
            const canAfford = budget >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-100">{item.name}</span>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-700/50">
                    {item.cost}金
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1 mb-0.5">{item.description}</div>
                <div className="flex items-center justify-between text-[10px] text-amber-300/90 font-mono font-medium">
                  <span>{item.details}</span>
                  <span className="text-amber-400 font-sans font-bold bg-amber-950/80 px-1 rounded">✍️なぞり可</span>
                </div>
              </button>
            );
          })}

        {selectedCategory === 'turret' &&
          Object.values(TURRET_DEFS).map(item => {
            const isSelected = selectedItemId === item.id;
            const canAfford = budget >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-100">{item.name}</span>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-700/50">
                    {item.cost}金
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1 mb-0.5">{item.description}</div>
                <div className="flex items-center justify-between text-[10px] text-blue-300 font-mono font-medium">
                  <span>{item.details}</span>
                  <span className="text-slate-400 font-sans">👆1基配置</span>
                </div>
              </button>
            );
          })}

        {selectedCategory === 'soldier' &&
          Object.values(SOLDIER_DEFS).map(item => {
            const isSelected = selectedItemId === item.id;
            const canAfford = budget >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-100">{item.name}</span>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-700/50">
                    {item.cost}金
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1 mb-0.5">{item.description}</div>
                <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono font-medium">
                  <span>{item.details}</span>
                  <span className="text-slate-400 font-sans">👆1名配置</span>
                </div>
              </button>
            );
          })}
      </div>

      {/* SOLDIER STANCE SELECTION & BATCH CONTROL */}
      {selectedCategory === 'soldier' && (
        <div className="space-y-2">
          {/* New Deployed Stance Selector */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-2.5">
            <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>新規配置兵士の初期作戦:</span>
              <span className="text-[11px] text-slate-400 font-normal">※やられた兵士は15秒後に自陣から復活します</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['defense', 'attack', 'hybrid'] as SoldierStance[]).map(stance => {
                const info = STANCE_INFO[stance];
                const isCurrent = soldierStance === stance;
                return (
                  <button
                    key={stance}
                    type="button"
                    onClick={() => setSoldierStance(stance)}
                    className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all ${
                      isCurrent
                        ? 'bg-slate-700 border-amber-400 shadow ring-1 ring-amber-400/40'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.badge}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-100">{info.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{info.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ALL SOLDIERS STANCE BATCH SWITCHER */}
          {playerSoldiers.length > 0 && onChangeAllStances && (
            <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-amber-500/40 rounded-xl p-2.5">
              <div className="text-xs font-bold text-amber-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  全員の作戦を一括変更 (配置済み {playerSoldiers.length}名):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  攻:{attackCount}名 / 守:{defenseCount}名 / 遊:{hybridCount}名
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeAllStances('attack')}
                  className="py-1.5 px-2 bg-red-950/60 hover:bg-red-900 border border-red-600 text-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">攻</span>
                  <span>全員「攻」に変更</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAllStances('defense')}
                  className="py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900 border border-blue-600 text-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">守</span>
                  <span>全員「守」に変更</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAllStances('hybrid')}
                  className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">遊</span>
                  <span>全員「遊」に変更</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions bar */}
      <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 px-1">
        <span>
          💡 <strong>配置方法:</strong> <span className="text-amber-300 font-bold">なぞって連続配置できるのは「壁」のみです。</span>砲台と兵士は1回クリックで1基ずつ配置されます。
        </span>
        <span className="text-amber-400/90 font-medium">
          ※ 2つの丸を破壊すると本陣攻撃可能！ 3分制限時間経過時は城砦の合計体力で判定勝ち！
        </span>
      </div>
    </div>
  );
};
