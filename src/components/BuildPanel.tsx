import React from 'react';
import {
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  STANCE_INFO,
} from '../gameConfig';
import { SoldierStance } from '../types';
import {
  Shield,
  Crosshair,
  Users,
  Coins,
  Clock,
  Sparkles,
  RotateCcw,
  Swords,
  Play,
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
  onApplyPreset: (preset: 'balanced' | 'artillery' | 'assault') => void;
  onClearAll: () => void;
  onStartBattle: () => void;
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
  onApplyPreset,
  onClearAll,
  onStartBattle,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-xl space-y-4 text-slate-100">
      {/* Top Header: Budget, Timer, and Battle Start */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Budget info */}
        <div className="flex items-center space-x-3 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-amber-500/30">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">防衛・雇用予算</div>
            <div className="text-lg font-bold text-amber-400">
              {budget} <span className="text-xs text-slate-400 font-normal">/ {maxBudget} 金</span>
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center space-x-3 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">築城・準備制限時間</div>
            <div className={`text-lg font-bold font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-slate-100'}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>
        </div>

        {/* Preset & Reset Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="dropdown relative group">
            <button
              type="button"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors text-slate-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              お城おすすめ配置
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
            className="px-3 py-2 bg-slate-800/80 hover:bg-red-950/60 border border-slate-700 hover:border-red-600 rounded-lg text-xs text-slate-300 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            全撤去
          </button>

          {/* Battle Start Button */}
          <button
            type="button"
            onClick={onStartBattle}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-bold text-white rounded-lg shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 text-sm"
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
          className={`py-2 px-3 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition-colors border ${
            selectedCategory === 'wall'
              ? 'bg-amber-600/30 text-amber-300 border-amber-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          防壁・城壁素材
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('turret');
            setSelectedItemId('arrow_tower');
          }}
          className={`py-2 px-3 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition-colors border ${
            selectedCategory === 'turret'
              ? 'bg-blue-600/30 text-blue-300 border-blue-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          砲台・迎撃施設
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('soldier');
            setSelectedItemId('samurai');
          }}
          className={`py-2 px-3 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition-colors border ${
            selectedCategory === 'soldier'
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
              : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          兵士雇用・戦術方針
        </button>
      </div>

      {/* Category Items List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {selectedCategory === 'wall' &&
          Object.values(WALL_DEFS).map(item => {
            const isSelected = selectedItemId === item.id;
            const canAfford = budget >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-100">{item.name}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                    {item.cost} 金
                  </span>
                </div>
                <div className="text-xs text-slate-300 line-clamp-1 mb-1">{item.description}</div>
                <div className="text-[11px] text-amber-300/90 font-mono font-medium">{item.details}</div>
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
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-100">{item.name}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                    {item.cost} 金
                  </span>
                </div>
                <div className="text-xs text-slate-300 line-clamp-1 mb-1">{item.description}</div>
                <div className="text-[11px] text-blue-300 font-mono font-medium">{item.details}</div>
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
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-100">{item.name}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                    {item.cost} 金
                  </span>
                </div>
                <div className="text-xs text-slate-300 line-clamp-1 mb-1">{item.description}</div>
                <div className="text-[11px] text-emerald-300 font-mono font-medium">{item.details}</div>
              </button>
            );
          })}
      </div>

      {/* SOLDIER STANCE SELECTION (守り / 攻め / ハイブリッド) */}
      {selectedCategory === 'soldier' && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
            <span>配置兵士の戦術指定 (デフォルト方針):</span>
            <span className="text-[11px] text-slate-400 font-normal">※配置済みの兵士をクリックして後から変更も可能</span>
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
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                    isCurrent
                      ? 'bg-slate-700 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.badge}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-100">{info.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{info.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions bar */}
      <div className="text-xs text-slate-400 flex items-center justify-between px-1">
        <span>
          💡 <strong>操作方法:</strong> 選択後、左側の【味方築城エリア】をクリックして配置。右クリックまたは自陣アイテムクリックで撤去・返金。
        </span>
        <span className="text-amber-400/90 font-medium">
          ※ 2つの丸（二の丸・三の丸）を壊すと敵の本陣に攻撃可能になります！
        </span>
      </div>
    </div>
  );
};
