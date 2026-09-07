import { MaterialType, TurretType, SoldierType, SoldierStance } from './types';

export const FIELD_WIDTH = 1300;
export const FIELD_HEIGHT = 680;

export const PLAYER_BUILD_ZONE = {
  minX: 30,
  maxX: 550,
  minY: 30,
  maxY: 650,
};

export const ENEMY_BUILD_ZONE = {
  minX: 750,
  maxX: 1270,
  minY: 30,
  maxY: 650,
};

export const STARTING_BUDGET = 2600; // 予算増加 (1800 -> 2600)
export const BUILD_TIME_LIMIT = 50; // seconds
export const BATTLE_TIME_LIMIT = 180; // 3分制限時間 (180秒)
export const SOLDIER_RESPAWN_SECONDS = 15; // やられた兵は15秒で復活
export const KILL_BOUNTY_GOLD = 45; // 相手の兵を倒すと予算獲得

export const BOMB_CONFIG = {
  cost: 250,
  damage: 480,
  radius: 110,
  name: '決戦援護爆弾',
  description: '予算で購入し、戦場の好きな位置へ投下できる強力な一撃爆弾。',
};

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  iconName: string;
  category: 'wall' | 'turret' | 'soldier';
  hp?: number;
  range?: number;
  attack?: number;
  speed?: number;
  details: string;
}

export const WALL_DEFS: Record<MaterialType, ItemDef> = {
  wood_wall: {
    id: 'wood_wall',
    name: '木製柵 (木壁)',
    description: '安価で素早く配置できる木の防壁。',
    cost: 25,
    iconName: 'Fence',
    category: 'wall',
    hp: 350,
    details: '耐久力: 350 | 低コスト防壁',
  },
  stone_wall: {
    id: 'stone_wall',
    name: '石垣 (石壁)',
    description: '頑強な石造りの城壁。兵士の進軍を阻む。',
    cost: 50,
    iconName: 'Shield',
    category: 'wall',
    hp: 900,
    details: '耐久力: 900 | 標準防壁',
  },
  iron_wall: {
    id: 'iron_wall',
    name: '鉄壁・城門',
    description: '鉄で補強された最高峰の重装壁。高い防御力。',
    cost: 95,
    iconName: 'Landmark',
    category: 'wall',
    hp: 1800,
    details: '耐久力: 1800 | 鉄壁防御',
  },
  spike_wall: {
    id: 'spike_wall',
    name: '棘の防柵 (反撃)',
    description: '鋭い棘が埋め込まれた壁。近接攻撃した敵に反撃ダメージ。',
    cost: 65,
    iconName: 'AlertTriangle',
    category: 'wall',
    hp: 550,
    details: '耐久力: 550 | 反撃ダメージ 20',
  },
};

export const TURRET_DEFS: Record<TurretType, ItemDef> = {
  arrow_tower: {
    id: 'arrow_tower',
    name: '矢倉 (弓櫓)',
    description: '矢を素早く連射し、侵入する敵兵を狙撃する。',
    cost: 160,
    iconName: 'Crosshair',
    category: 'turret',
    hp: 700,
    range: 220,
    attack: 32,
    details: '射程: 220 | 単体連射 1.0秒間隔',
  },
  cannon_battery: {
    id: 'cannon_battery',
    name: '大筒砲台 (大砲)',
    description: '重砲弾を発射し、着弾点で範囲爆発ダメージを与える。',
    cost: 250,
    iconName: 'Bomb',
    category: 'turret',
    hp: 850,
    range: 280,
    attack: 85,
    details: '射程: 280 | 範囲爆発 2.3秒間隔',
  },
  catapult: {
    id: 'catapult',
    name: '投石機 (カタパルト)',
    description: '超長距離から巨石を放ち、敵兵や壁を粉砕する。',
    cost: 230,
    iconName: 'Flame',
    category: 'turret',
    hp: 650,
    range: 330,
    attack: 130,
    details: '射程: 330 | 超長距離 3.0秒間隔',
  },
  fire_tower: {
    id: 'fire_tower',
    name: '火炎放射砲',
    description: '近寄る敵兵を猛火で焼き払う連続攻撃砲台。',
    cost: 180,
    iconName: 'Flame',
    category: 'turret',
    hp: 750,
    range: 150,
    attack: 22,
    details: '射程: 150 | 超高速放射 0.35秒間隔',
  },
};

export const SOLDIER_DEFS: Record<SoldierType, ItemDef> = {
  samurai: {
    id: 'samurai',
    name: '侍・刀歩兵',
    description: 'バランスの取れた白兵戦ユニット。刀で斬り捨てる。',
    cost: 75,
    iconName: 'Swords',
    category: 'soldier',
    hp: 360,
    attack: 32,
    speed: 1.8,
    details: 'HP: 360 | 攻撃: 32 | 近接斬撃',
  },
  archer: {
    id: 'archer',
    name: '弓兵 (射手)',
    description: '遠距離から矢を放ち、壁の向こうの敵も狙える。',
    cost: 85,
    iconName: 'Target',
    category: 'soldier',
    hp: 230,
    attack: 24,
    speed: 1.5,
    details: 'HP: 230 | 射程: 190 | 遠距離射撃',
  },
  sapper: {
    id: 'sapper',
    name: '破城兵 (工兵)',
    description: '防壁や砲台に特効！壁に対して3.5倍の破壊ダメージ。',
    cost: 110,
    iconName: 'Hammer',
    category: 'soldier',
    hp: 440,
    attack: 22,
    speed: 1.4,
    details: 'HP: 440 | 対壁ダメージ 3.5倍！',
  },
  cavalry: {
    id: 'cavalry',
    name: '騎馬隊 (突撃騎兵)',
    description: '圧倒的な機動力で敵陣へ突撃する騎兵。高攻撃力。',
    cost: 140,
    iconName: 'Zap',
    category: 'soldier',
    hp: 500,
    attack: 48,
    speed: 2.7,
    details: 'HP: 500 | 移動: 2.7 | 強力突撃',
  },
};

export const STANCE_INFO: Record<SoldierStance, { name: string; desc: string; color: string; badge: string }> = {
  defense: {
    name: '守り (防衛)',
    desc: '自陣の丸・本陣を守る。進入した敵を迎撃・護衛。',
    color: '#3b82f6',
    badge: '守',
  },
  attack: {
    name: '攻め (進撃)',
    desc: '敵陣の丸・本陣へ直進！立ちふさがる壁や砲台を破壊しながら突撃。',
    color: '#ef4444',
    badge: '攻',
  },
  hybrid: {
    name: 'ハイブリッド (遊撃)',
    desc: '戦場の中央へ進出し、近傍の敵と交戦しつつ機会を見て敵陣を急襲。',
    color: '#10b981',
    badge: '遊',
  },
};
