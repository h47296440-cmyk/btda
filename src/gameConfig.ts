import {
  MaterialType,
  TurretType,
  SoldierType,
  SoldierStance,
  GameMode,
  NationConfig,
  TerrainZone,
} from './types';

export interface GameModeConfig {
  id: GameMode;
  name: string;
  tag: string;
  description: string;
  fieldWidth: number;
  fieldHeight: number;
  buildTimeLimit: number;
  battleTimeLimit: number;
  startingBudget: number;
  nations: NationConfig[];
  terrainZones: TerrainZone[];
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  '2_nations': {
    id: '2_nations',
    name: '2ヶ国 一騎当千戦',
    tag: '通常決戦',
    description: '東西両雄が激突する基本モード。二の丸・三の丸を突破して本陣を討ち取れ。',
    fieldWidth: 1300,
    fieldHeight: 680,
    buildTimeLimit: 60,
    battleTimeLimit: 180,
    startingBudget: 2600,
    nations: [
      {
        id: 'player',
        name: '蒼龍軍 (自軍)',
        leader: '武将 (プレイヤー)',
        color: '#3b82f6',
        accentColor: '#60a5fa',
        kanji: '蒼',
        isPlayer: true,
        buildZone: { minX: 30, maxX: 550, minY: 30, maxY: 650 },
        basePos: {
          honjin: { x: 160, y: 340 },
          maru1: { x: 320, y: 190 },
          maru2: { x: 320, y: 490 },
        },
      },
      {
        id: 'enemy',
        name: '紅蓮軍 (CPU)',
        leader: '赤備えの智将',
        color: '#ef4444',
        accentColor: '#f87171',
        kanji: '紅',
        isPlayer: false,
        buildZone: { minX: 750, maxX: 1270, minY: 30, maxY: 650 },
        basePos: {
          honjin: { x: 1140, y: 340 },
          maru1: { x: 980, y: 190 },
          maru2: { x: 980, y: 490 },
        },
      },
    ],
    terrainZones: [],
  },
  '4_nations': {
    id: '4_nations',
    name: '4ヶ国 四国大乱戦',
    tag: '広域合戦',
    description: '戦場が1800x1100へ大幅拡大！東西南北の4大国が四つ巴の激戦を繰り広げる。建築制限110秒・合戦制限6分！',
    fieldWidth: 1800,
    fieldHeight: 1100,
    buildTimeLimit: 110,
    battleTimeLimit: 360,
    startingBudget: 3400,
    nations: [
      {
        id: 'player',
        name: '蒼龍軍 (自軍・西南)',
        leader: '武将 (プレイヤー)',
        color: '#3b82f6',
        accentColor: '#60a5fa',
        kanji: '蒼',
        isPlayer: true,
        buildZone: { minX: 40, maxX: 580, minY: 560, maxY: 1060 },
        basePos: {
          honjin: { x: 170, y: 930 },
          maru1: { x: 340, y: 780 },
          maru2: { x: 450, y: 950 },
        },
      },
      {
        id: 'enemy_1',
        name: '紅蓮軍 (CPU・東北)',
        leader: '北条相模守',
        color: '#ef4444',
        accentColor: '#f87171',
        kanji: '紅',
        isPlayer: false,
        buildZone: { minX: 1220, maxX: 1760, minY: 40, maxY: 540 },
        basePos: {
          honjin: { x: 1630, y: 170 },
          maru1: { x: 1460, y: 320 },
          maru2: { x: 1350, y: 150 },
        },
      },
      {
        id: 'enemy_2',
        name: '翠風軍 (CPU・西北)',
        leader: '上杉越後守',
        color: '#10b981',
        accentColor: '#34d399',
        kanji: '翠',
        isPlayer: false,
        buildZone: { minX: 40, maxX: 580, minY: 40, maxY: 540 },
        basePos: {
          honjin: { x: 170, y: 170 },
          maru1: { x: 340, y: 320 },
          maru2: { x: 450, y: 150 },
        },
      },
      {
        id: 'enemy_3',
        name: '紫電軍 (CPU・東南)',
        leader: '武田甲斐守',
        color: '#8b5cf6',
        accentColor: '#a78bfa',
        kanji: '紫',
        isPlayer: false,
        buildZone: { minX: 1220, maxX: 1760, minY: 560, maxY: 1060 },
        basePos: {
          honjin: { x: 1630, y: 930 },
          maru1: { x: 1460, y: 780 },
          maru2: { x: 1350, y: 950 },
        },
      },
    ],
    terrainZones: [],
  },
  '8_nations': {
    id: '8_nations',
    name: '8ヶ国 天下争覇戦',
    tag: '超巨大戦場・地形ギミック',
    description: '2400x1400の超広大な戦場に8ヶ国が集結！足が遅くなる「沼地」や滑りやすくなる「氷原」が出現。建築160秒・合戦9分！',
    fieldWidth: 2400,
    fieldHeight: 1400,
    buildTimeLimit: 160,
    battleTimeLimit: 540,
    startingBudget: 4200,
    nations: [
      {
        id: 'player',
        name: '蒼龍軍 (自軍・西南)',
        leader: '武将 (プレイヤー)',
        color: '#3b82f6',
        accentColor: '#60a5fa',
        kanji: '蒼',
        isPlayer: true,
        buildZone: { minX: 40, maxX: 520, minY: 800, maxY: 1360 },
        basePos: {
          honjin: { x: 160, y: 1240 },
          maru1: { x: 330, y: 1080 },
          maru2: { x: 440, y: 1260 },
        },
      },
      {
        id: 'enemy_1',
        name: '紅蓮軍 (CPU・東北)',
        leader: '真田安房守',
        color: '#ef4444',
        accentColor: '#f87171',
        kanji: '紅',
        isPlayer: false,
        buildZone: { minX: 1880, maxX: 2360, minY: 40, maxY: 600 },
        basePos: {
          honjin: { x: 2240, y: 160 },
          maru1: { x: 2070, y: 320 },
          maru2: { x: 1960, y: 140 },
        },
      },
      {
        id: 'enemy_2',
        name: '翠風軍 (CPU・北中西)',
        leader: '上杉弾正少弼',
        color: '#10b981',
        accentColor: '#34d399',
        kanji: '翠',
        isPlayer: false,
        buildZone: { minX: 680, maxX: 1140, minY: 40, maxY: 500 },
        basePos: {
          honjin: { x: 910, y: 150 },
          maru1: { x: 770, y: 320 },
          maru2: { x: 1050, y: 320 },
        },
      },
      {
        id: 'enemy_3',
        name: '紫電軍 (CPU・北中東)',
        leader: '武田大膳大夫',
        color: '#8b5cf6',
        accentColor: '#a78bfa',
        kanji: '紫',
        isPlayer: false,
        buildZone: { minX: 1260, maxX: 1720, minY: 40, maxY: 500 },
        basePos: {
          honjin: { x: 1490, y: 150 },
          maru1: { x: 1350, y: 320 },
          maru2: { x: 1630, y: 320 },
        },
      },
      {
        id: 'enemy_4',
        name: '焔火軍 (CPU・東南)',
        leader: '島津薩摩守',
        color: '#f97316',
        accentColor: '#fb923c',
        kanji: '焔',
        isPlayer: false,
        buildZone: { minX: 1880, maxX: 2360, minY: 800, maxY: 1360 },
        basePos: {
          honjin: { x: 2240, y: 1240 },
          maru1: { x: 2070, y: 1080 },
          maru2: { x: 1960, y: 1260 },
        },
      },
      {
        id: 'enemy_5',
        name: '桜花軍 (CPU・南中東)',
        leader: '前田加賀守',
        color: '#ec4899',
        accentColor: '#f472b6',
        kanji: '桜',
        isPlayer: false,
        buildZone: { minX: 1260, maxX: 1720, minY: 900, maxY: 1360 },
        basePos: {
          honjin: { x: 1490, y: 1250 },
          maru1: { x: 1350, y: 1080 },
          maru2: { x: 1630, y: 1080 },
        },
      },
      {
        id: 'enemy_6',
        name: '黄金軍 (CPU・南中西)',
        leader: '織田右大臣',
        color: '#eab308',
        accentColor: '#facc15',
        kanji: '金',
        isPlayer: false,
        buildZone: { minX: 680, maxX: 1140, minY: 900, maxY: 1360 },
        basePos: {
          honjin: { x: 910, y: 1250 },
          maru1: { x: 770, y: 1080 },
          maru2: { x: 1050, y: 1080 },
        },
      },
      {
        id: 'enemy_7',
        name: '墨夜軍 (CPU・西北)',
        leader: '伊達陸奥守',
        color: '#64748b',
        accentColor: '#94a3b8',
        kanji: '墨',
        isPlayer: false,
        buildZone: { minX: 40, maxX: 520, minY: 40, maxY: 600 },
        basePos: {
          honjin: { x: 160, y: 160 },
          maru1: { x: 330, y: 320 },
          maru2: { x: 440, y: 140 },
        },
      },
    ],
    terrainZones: [
      // 沼地 (Swamps: Foot speed slows significantly to 0.42x)
      {
        id: 'swamp_west',
        type: 'swamp',
        name: '泥濘の毒沼 (西)',
        x: 540,
        y: 560,
        width: 250,
        height: 280,
        color: '#1a2e16',
      },
      {
        id: 'swamp_east',
        type: 'swamp',
        name: '底なし沼 (東)',
        x: 1610,
        y: 560,
        width: 250,
        height: 280,
        color: '#1a2e16',
      },
      // 氷原 (Ice: Slippery rapid gliding at 1.55x speed)
      {
        id: 'ice_north',
        type: 'ice',
        name: '凍結大湖 (北)',
        x: 1020,
        y: 440,
        width: 360,
        height: 180,
        color: '#083344',
      },
      {
        id: 'ice_south',
        type: 'ice',
        name: '白銀の氷原 (南)',
        x: 1020,
        y: 780,
        width: 360,
        height: 180,
        color: '#083344',
      },
      {
        id: 'ice_center',
        type: 'ice',
        name: '天王山・中央氷裂',
        x: 1080,
        y: 650,
        width: 240,
        height: 100,
        color: '#0e7490',
      },
    ],
  },
};

// Default backwards-compatible constants
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
export const BUILD_TIME_LIMIT = 60; // seconds
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
  color?: string;
}

export type BuildOption = ItemDef;

export const WALL_DEFS: Record<MaterialType, ItemDef> = {
  wood_wall: {
    id: 'wood_wall',
    name: '木製柵 (木壁)',
    description: '安価で素早く配置できる木の防壁。',
    cost: 25,
    iconName: 'Fence',
    category: 'wall',
    hp: 350,
    color: '#a16207',
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
    color: '#64748b',
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
    color: '#334155',
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
    color: '#854d0e',
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
