export type Team = 'player' | 'enemy';

export type SoldierStance = 'attack' | 'defense' | 'hybrid';

export type MaterialType = 'wood_wall' | 'stone_wall' | 'iron_wall' | 'spike_wall';

export type TurretType = 'arrow_tower' | 'cannon_battery' | 'catapult' | 'fire_tower';

export type SoldierType = 'samurai' | 'archer' | 'sapper' | 'cavalry';

export type StructureType = MaterialType | TurretType | 'honjin' | 'maru_1' | 'maru_2';

export interface Structure {
  id: string;
  type: StructureType;
  team: Team;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  cost: number;
  range?: number;
  attackPower?: number;
  attackCooldown?: number;
  lastAttackTime?: number;
  isObjective?: boolean; // true for Honjin and Maru
  objectiveType?: 'honjin' | 'maru_1' | 'maru_2';
  isInvulnerable?: boolean; // Honjin is invulnerable until both Maru are destroyed
  spikeDamage?: number;
}

export interface Soldier {
  id: string;
  type: SoldierType;
  team: Team;
  stance: SoldierStance;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackPower: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  targetId: string | null;
  targetType: 'soldier' | 'structure' | null;
  siegeMultiplier: number; // damage multiplier against walls/structures
  cost: number;
  kills: number;
  facing: number; // angle in radians
  isAttacking?: boolean;
  attackAnimTimer?: number;
  avoidDir?: number; // Preference direction (+1 or -1) when steering around obstacles
  stuckTimer?: number; // Track duration near obstacles to resolve deadlocks
}

export interface Projectile {
  id: string;
  sourceTeam: Team;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  speed: number;
  damage: number;
  splashRadius: number;
  type: 'arrow' | 'cannonball' | 'boulder' | 'fire';
  arcHeight: number;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  color: string;
  opacity: number;
  scale: number;
  text?: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'smoke' | 'debris' | 'shield';
}

export type GamePhase = 'build' | 'battle' | 'ended';

export type Winner = Team | 'draw' | null;

export interface RespawnQueueItem {
  id: string;
  type: SoldierType;
  team: Team;
  stance: SoldierStance;
  respawnTime: number; // gameTime when soldier respawns (15 seconds after death)
}

export interface TacticalBomb {
  id: string;
  sourceTeam?: Team; // 'player' or 'enemy'
  targetX: number;
  targetY: number;
  startY: number;
  currentY: number;
  progress: number;
  exploded: boolean;
}

export interface GameStats {
  wallsDestroyedByPlayer: number;
  wallsDestroyedByEnemy: number;
  soldiersKilledByPlayer: number;
  soldiersKilledByEnemy: number;
  damageDealtByPlayer: number;
  damageDealtByEnemy: number;
  winner: Winner;
  endReason?: 'honjin_destroyed' | 'time_limit';
  playerTotalHp?: number;
  enemyTotalHp?: number;
}
