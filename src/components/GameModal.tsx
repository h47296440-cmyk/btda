import React from 'react';
import { GameStats, Team } from '../types';
import { Trophy, Skull, RotateCcw, BookOpen, X, Shield, Swords, Users, Castle } from 'lucide-react';

interface ResultModalProps {
  winner: Team;
  stats: GameStats;
  battleTime: number;
  onRestart: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  winner,
  stats,
  battleTime,
  onRestart,
}) => {
  const isVictory = winner === 'player';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-5">
        {/* Victory or Defeat Icon */}
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg ${
            isVictory
              ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/50'
              : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
          }`}
        >
          {isVictory ? <Trophy className="w-10 h-10 animate-bounce" /> : <Skull className="w-10 h-10" />}
        </div>

        <div>
          <h2 className={`text-2xl font-black ${isVictory ? 'text-amber-400' : 'text-red-400'}`}>
            {isVictory ? '天下統一・大勝利！' : '無念・本陣陥落（敗北）'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {isVictory
              ? '二つの丸を破壊し、敵本陣の攻略に成功しました！'
              : '自陣の防衛が破られ、本陣が壊滅しました。'}
          </p>
        </div>

        {/* Battle Statistics Grid */}
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 text-left space-y-2.5 text-xs text-slate-300">
          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1.5 flex justify-between">
            <span>合戦戦果レポート</span>
            <span className="font-mono text-amber-400">
              時間:{' '}
              {Math.floor(battleTime / 60)
                .toString()
                .padStart(2, '0')}
              :
              {Math.floor(battleTime % 60)
                .toString()
                .padStart(2, '0')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <Castle className="w-3.5 h-3.5 text-blue-400" /> 破壊した敵の防壁
            </span>
            <span className="font-mono font-bold text-slate-100">{stats.wallsDestroyedByPlayer} 箇所</span>
          </div>

          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> 討ち取った敵兵士
            </span>
            <span className="font-mono font-bold text-slate-100">{stats.soldiersKilledByPlayer} 名</span>
          </div>

          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-400" /> 破壊された自軍防壁
            </span>
            <span className="font-mono text-slate-400">{stats.wallsDestroyedByEnemy} 箇所</span>
          </div>

          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-amber-400" /> 戦死した自軍兵士
            </span>
            <span className="font-mono text-slate-400">{stats.soldiersKilledByEnemy} 名</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度築城して戦う
        </button>
      </div>
    </div>
  );
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-lg font-bold text-amber-400 border-b border-slate-800 pb-2">
          <BookOpen className="w-5 h-5" />
          <span>合戦ルールと戦術手引き</span>
        </div>

        {/* Rule 1: Maru and Honjin condition */}
        <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
          <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
            <span>🏯 二つの丸と本陣の攻略ルール（勝利条件）</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ・お城には<strong>「本陣」</strong>と<strong>「二の丸」「三の丸」</strong>が存在します。<br />
            ・合戦開始時、<strong>本陣は強固な守護結界で無敵</strong>となっており直接ダメージを与えられません。<br />
            ・相手の<strong>「二の丸」と「三の丸」の両方を破壊</strong>すると、本陣の結界が消滅して直接攻撃可能になります！<br />
            ・露出した相手の本陣を攻め落とせば<strong>勝利</strong>となります。
          </p>
        </div>

        {/* Rule 2: Soldier Stances */}
        <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
          <div className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
            <span>⚔️ 兵士の3方針（守り・攻め・ハイブリッド）</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            兵士は雇用時に方針を指定できるほか、合戦中も兵士をクリックしてリアルタイムに指示変更可能です。
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-blue-600/40 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0 mt-0.5">
                守
              </span>
              <div>
                <span className="font-bold text-blue-300">守り (防衛):</span> 自陣の丸や本陣を守るため陣地内に留まり、侵入してきた敵兵を迎撃・護衛します。
              </div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-red-600/40 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0 mt-0.5">
                攻
              </span>
              <div>
                <span className="font-bold text-red-300">攻め (進撃):</span> 敵城へ直進！立ちふさがる敵の壁や砲台を破壊しながら突撃し、丸と本陣を狙います。
              </div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-emerald-600/40 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0 mt-0.5">
                遊
              </span>
              <div>
                <span className="font-bold text-emerald-300">ハイブリッド (遊撃):</span> 戦場の中央に進出して近傍の敵と交戦し、好機を見て敵陣へ攻め入ります。
              </div>
            </div>
          </div>
        </div>

        {/* Rule 3: Materials & Wall Breakers */}
        <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
          <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
            <span>🛡️ 壁の素材と兵種・砲台の連携</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ・<strong>木壁</strong>（安価）、<strong>石垣</strong>（標準頑丈）、<strong>鉄壁</strong>（超高耐久）、<strong>棘の防柵</strong>（近接攻撃してきた敵に反撃ダメージ）。<br />
            ・<strong>破城兵（工兵）</strong>は防壁に対して<strong>3.5倍の特効ダメージ</strong>を持ち、壁を素早く突破できます。<br />
            ・壁の奥に<strong>矢倉</strong>や<strong>大筒</strong>を配置して、壁を壊そうとする敵兵を一網打尽にしましょう！
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-600 transition-colors text-xs"
        >
          理解した（閉じる）
        </button>
      </div>
    </div>
  );
};
