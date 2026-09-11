import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Structure,
  Soldier,
  Projectile,
  DamageNumber,
  Particle,
  GamePhase,
  SoldierStance,
  RespawnQueueItem,
  TacticalBomb,
  Team,
  TerrainZone,
  RallyPoint,
  GameMode,
} from '../types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  WALL_DEFS,
  TURRET_DEFS,
  SOLDIER_DEFS,
  BOMB_CONFIG,
  BuildOption,
  GameModeConfig,
} from '../gameConfig';
import { sounds } from '../audio';

export const NATION_THEMES: Record<
  Team,
  { name: string; kanji: string; primary: string; secondary: string; border: string }
> = {
  player: { name: '自軍 (蒼龍)', kanji: '蒼', primary: '#2563eb', secondary: '#1e3a8a', border: '#60a5fa' },
  enemy: { name: '敵軍 (紅蓮)', kanji: '紅', primary: '#dc2626', secondary: '#7f1d1d', border: '#f87171' },
  enemy_1: { name: '第1国 (紅蓮)', kanji: '紅', primary: '#dc2626', secondary: '#7f1d1d', border: '#f87171' },
  enemy_2: { name: '第2国 (翠嵐)', kanji: '翠', primary: '#16a34a', secondary: '#14532d', border: '#4ade80' },
  enemy_3: { name: '第3国 (紫電)', kanji: '紫', primary: '#9333ea', secondary: '#581c87', border: '#c084fc' },
  enemy_4: { name: '第4国 (焔火)', kanji: '焔', primary: '#ea580c', secondary: '#7c2d12', border: '#fb923c' },
  enemy_5: { name: '第5国 (桜華)', kanji: '桜', primary: '#db2777', secondary: '#831843', border: '#f472b6' },
  enemy_6: { name: '第6国 (黄金)', kanji: '金', primary: '#ca8a04', secondary: '#713f12', border: '#fde047' },
  enemy_7: { name: '第7国 (墨玄)', kanji: '墨', primary: '#475569', secondary: '#0f172a', border: '#94a3b8' },
};

interface BattleCanvasProps {
  phase: GamePhase;
  structures: Structure[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  respawnQueue: RespawnQueueItem[];
  tacticalBomb: TacticalBomb | null;
  selectedItem: BuildOption | null;
  selectedStance: SoldierStance;
  playerBudget: number;
  onPlaceStructure: (x: number, y: number) => void;
  onPlaceWallSegment: (x: number, y: number) => boolean;
  onPlaceSoldier: (x: number, y: number) => void;
  onSelectSoldier: (soldierId: string | null) => void;
  onRefundStructure: (structureId: string) => void;
  onDropBomb: (x: number, y: number) => void;
  selectedSoldierId: string | null;
  isBombTargeting: boolean;
  gameTime: number;

  // New multi-nation, terrain, and manual movement props
  gameMode?: GameMode;
  modeConfig?: GameModeConfig;
  terrainZones?: TerrainZone[];
  fieldWidth?: number;
  fieldHeight?: number;
  playerBuildZone?: { minX: number; maxX: number; minY: number; maxY: number };
  rallyPoint?: RallyPoint | null;
  onSetRallyPoint?: (x: number, y: number) => void;
  isRallyTargeting?: boolean;
  isPathDrawing?: boolean;
  onPathDrawn?: (points: { x: number; y: number }[]) => void;
}

export const BattleCanvas: React.FC<BattleCanvasProps> = ({
  phase,
  structures,
  soldiers,
  projectiles,
  damageNumbers,
  particles,
  respawnQueue,
  tacticalBomb,
  selectedItem,
  selectedStance,
  playerBudget,
  onPlaceStructure,
  onPlaceWallSegment,
  onPlaceSoldier,
  onSelectSoldier,
  onRefundStructure,
  onDropBomb,
  selectedSoldierId,
  isBombTargeting,
  gameTime,
  gameMode = '2_nations',
  modeConfig,
  terrainZones = [],
  fieldWidth = FIELD_WIDTH,
  fieldHeight = FIELD_HEIGHT,
  playerBuildZone = PLAYER_BUILD_ZONE,
  rallyPoint = null,
  onSetRallyPoint,
  isRallyTargeting = false,
  isPathDrawing = false,
  onPathDrawn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Active path drawing points during dragging
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const isDrawingPathRef = useRef<boolean>(false);

  // Drag-placement references
  const isDraggingRef = useRef<boolean>(false);
  const lastPlacedPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const touchHandledRef = useRef<boolean>(false);

  // Helper to check valid build position
  const isValidBuildPos = useCallback(
    (x: number, y: number): boolean => {
      if (
        x < playerBuildZone.minX ||
        x > playerBuildZone.maxX ||
        y < playerBuildZone.minY ||
        y > playerBuildZone.maxY
      ) {
        return false;
      }
      for (const st of structures) {
        if (st.team === 'player' && Math.hypot(st.x - x, st.y - y) < st.width / 2 + 16) {
          return false;
        }
      }
      return true;
    },
    [structures, playerBuildZone]
  );

  // Coordinate conversion helper
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = fieldWidth / rect.width;
      const scaleY = fieldHeight / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [fieldWidth, fieldHeight]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, fieldWidth, fieldHeight);

    // 1. Draw Battlefield Background
    const grassGrad = ctx.createLinearGradient(0, 0, fieldWidth, fieldHeight);
    grassGrad.addColorStop(0, '#1c3d18');
    grassGrad.addColorStop(0.5, '#284e20');
    grassGrad.addColorStop(1, '#1c3d18');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, fieldWidth, fieldHeight);

    // Subtle grass texture
    ctx.fillStyle = 'rgba(15, 35, 12, 0.4)';
    const patchCount = Math.floor((fieldWidth * fieldHeight) / 18000);
    for (let i = 0; i < patchCount; i++) {
      const gx = (i * 127) % fieldWidth;
      const gy = (i * 151) % fieldHeight;
      ctx.fillRect(gx, gy, 5, 3);
    }

    // Central River Moat (if 2-nations)
    if (gameMode === '2_nations') {
      const riverW = 100;
      const riverX = fieldWidth / 2 - riverW / 2;
      const waterGrad = ctx.createLinearGradient(riverX, 0, riverX + riverW, 0);
      waterGrad.addColorStop(0, '#172554');
      waterGrad.addColorStop(0.5, '#2563eb');
      waterGrad.addColorStop(1, '#172554');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(riverX, 0, riverW, fieldHeight);

      // Water ripples
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.35)';
      ctx.lineWidth = 1.5;
      const waveOffset = (gameTime * 28) % 60;
      for (let wy = -60; wy < fieldHeight + 60; wy += 35) {
        ctx.beginPath();
        ctx.moveTo(riverX + 12, wy + waveOffset);
        ctx.bezierCurveTo(
          riverX + 35,
          wy + waveOffset - 6,
          riverX + 65,
          wy + waveOffset + 6,
          riverX + riverW - 12,
          wy + waveOffset
        );
        ctx.stroke();
      }

      // Bridges
      const drawBridge = (by: number) => {
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(riverX - 8, by, riverW + 16, 58);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        for (let bx = riverX - 6; bx <= riverX + riverW + 6; bx += 11) {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx, by + 58);
          ctx.stroke();
        }
        ctx.fillStyle = '#713f12';
        ctx.fillRect(riverX - 10, by - 4, riverW + 20, 6);
        ctx.fillRect(riverX - 10, by + 56, riverW + 20, 6);
      };
      drawBridge(150);
      drawBridge(fieldHeight - 208);
    }

    // 2. Draw Environmental Hazard Terrains (沼地・氷原)
    for (const zone of terrainZones) {
      ctx.save();
      if (zone.type === 'swamp') {
        // Swamp: murky dark olive with bubbling edge & reeds
        const swampGrad = ctx.createRadialGradient(
          zone.x + zone.width / 2,
          zone.y + zone.height / 2,
          10,
          zone.x + zone.width / 2,
          zone.y + zone.height / 2,
          zone.width * 0.6
        );
        swampGrad.addColorStop(0, '#2e2413');
        swampGrad.addColorStop(0.7, '#241a0d');
        swampGrad.addColorStop(1, '#1b1206');
        ctx.fillStyle = swampGrad;
        ctx.beginPath();
        ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 16);
        ctx.fill();

        ctx.strokeStyle = 'rgba(120, 85, 45, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Bubbles animation
        for (let b = 0; b < 6; b++) {
          const bx = zone.x + 20 + ((b * 47 + gameTime * 20) % (zone.width - 40));
          const by = zone.y + 15 + ((b * 31 + gameTime * 15) % (zone.height - 30));
          const bSize = 3 + Math.sin(gameTime * 4 + b) * 1.5;
          ctx.fillStyle = 'rgba(163, 114, 60, 0.4)';
          ctx.beginPath();
          ctx.arc(bx, by, bSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Zone Label
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('【泥沼】足止低下 (速度0.42x)', zone.x + zone.width / 2, zone.y + 20);
      } else if (zone.type === 'ice') {
        // Ice: glassy cyan frost sheet with crystalline sheen
        const iceGrad = ctx.createLinearGradient(zone.x, zone.y, zone.x + zone.width, zone.y + zone.height);
        iceGrad.addColorStop(0, 'rgba(186, 230, 253, 0.55)');
        iceGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.45)');
        iceGrad.addColorStop(1, 'rgba(224, 242, 254, 0.6)');
        ctx.fillStyle = iceGrad;
        ctx.beginPath();
        ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 16);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Frost crack lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(zone.x + 30, zone.y + 20);
        ctx.lineTo(zone.x + zone.width * 0.4, zone.y + zone.height * 0.5);
        ctx.lineTo(zone.x + zone.width * 0.7, zone.y + 35);
        ctx.stroke();

        // Zone Label
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('【凍結氷原】滑走急加速 (速度1.55x)', zone.x + zone.width / 2, zone.y + 20);
      }
      ctx.restore();
    }

    // 3. Castle Grounds (Player & Enemy zones)
    if (phase === 'build') {
      ctx.save();
      // Player build zone
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        playerBuildZone.minX,
        playerBuildZone.minY,
        playerBuildZone.maxX - playerBuildZone.minX,
        playerBuildZone.maxY - playerBuildZone.minY
      );
      ctx.fillRect(
        playerBuildZone.minX,
        playerBuildZone.minY,
        playerBuildZone.maxX - playerBuildZone.minX,
        playerBuildZone.maxY - playerBuildZone.minY
      );

      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('【自軍建築エリア】', playerBuildZone.minX + 12, playerBuildZone.minY + 22);

      // Other nations build grounds
      if (modeConfig) {
        for (const nat of modeConfig.nations) {
          if (nat.isPlayer) continue;
          ctx.strokeStyle = nat.color;
          ctx.strokeRect(
            nat.buildZone.minX,
            nat.buildZone.minY,
            nat.buildZone.maxX - nat.buildZone.minX,
            nat.buildZone.maxY - nat.buildZone.minY
          );
          ctx.fillStyle = nat.accentColor;
          ctx.fillText(`【${nat.name} 陣営】`, nat.buildZone.minX + 12, nat.buildZone.minY + 22);
        }
      }
      ctx.restore();
    }

    // 4. Draw Structures
    for (const struct of structures) {
      const isPlayer = struct.team === 'player';
      const isDestroyed = struct.hp <= 0;
      const theme = NATION_THEMES[struct.team] || NATION_THEMES['enemy'];

      ctx.save();
      ctx.translate(struct.x, struct.y);

      if (struct.isObjective) {
        if (struct.objectiveType === 'honjin') {
          const size = struct.width;

          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(0, size * 0.35, size * 0.55, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();

          if (isDestroyed) {
            ctx.fillStyle = '#44403c';
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('陥落 (本陣壊滅)', 0, 0);
          } else {
            // Keep Base Stone Wall
            ctx.fillStyle = '#475569';
            ctx.fillRect(-size / 2, -size * 0.2, size, size * 0.7);

            // Upper Castle Pavilion
            ctx.fillStyle = theme.secondary;
            ctx.fillRect(-size * 0.38, -size * 0.45, size * 0.76, size * 0.4);

            // Japanese Roof
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.72);
            ctx.lineTo(size * 0.55, -size * 0.38);
            ctx.lineTo(size * 0.45, -size * 0.35);
            ctx.lineTo(-size * 0.45, -size * 0.35);
            ctx.lineTo(-size * 0.55, -size * 0.38);
            ctx.closePath();
            ctx.fill();

            // Heraldic Kanji Crest
            ctx.fillStyle = theme.primary;
            ctx.beginPath();
            ctx.arc(0, -size * 0.52, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(theme.kanji, 0, -size * 0.52 + 3.5);

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(theme.name, 0, size * 0.24);

            // INVULNERABLE SHIELD BARRIER
            if (struct.isInvulnerable) {
              const barrierPulse = 1 + Math.sin(gameTime * 4) * 0.05;
              const radius = size * 0.68 * barrierPulse;

              ctx.strokeStyle = theme.border;
              ctx.lineWidth = 3;
              ctx.setLineDash([6, 4]);
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = theme.primary + '25';
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = theme.border;
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText('結界無敵 (二丸破壊で解除)', 0, -size * 0.78);
            } else {
              const pulse = (Math.sin(gameTime * 8) + 1) / 2;
              ctx.strokeStyle = `rgba(234, 88, 12, ${0.4 + pulse * 0.5})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = '#f97316';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText('★ 攻撃可能！ ★', 0, -size * 0.78);
            }
          }
        } else {
          // MARU
          const size = struct.width;
          const maruName = struct.objectiveType === 'maru_1' ? '二の丸' : '三の丸';

          if (isDestroyed) {
            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.fillStyle = '#a1a1aa';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${maruName} (陥落)`, 0, 4);
          } else {
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.roundRect(-size / 2, -size / 2, size, size, 8);
            ctx.fill();

            ctx.fillStyle = theme.primary;
            ctx.beginPath();
            ctx.roundRect(-size * 0.35, -size * 0.35, size * 0.7, size * 0.7, 4);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(maruName, 0, 3);
          }
        }
      } else {
        // Normal Walls and Turrets
        const def = struct.type.includes('wall') ? WALL_DEFS[struct.type as any] : TURRET_DEFS[struct.type as any];

        if (def) {
          ctx.fillStyle = def.color || '#94a3b8';
          ctx.strokeStyle = theme.border;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height, 4);
          ctx.fill();
          ctx.stroke();

          // Turret visual
          if (struct.range) {
            ctx.fillStyle = theme.secondary;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(def.icon || '塔', 0, 3);
          }
        }
      }

      // HP Bar
      if (!isDestroyed) {
        const barW = struct.width + 10;
        const barH = 5;
        const hpPct = Math.max(0, struct.hp / struct.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, struct.height / 2 + 5, barW, barH);
        ctx.fillStyle = isPlayer ? '#3b82f6' : '#ef4444';
        ctx.fillRect(-barW / 2, struct.height / 2 + 5, barW * hpPct, barH);
      }

      ctx.restore();
    }

    // 5. Draw Drawn March Paths & Waypoints (進軍路なぞり表示)
    // A. Currently being drawn by user
    if (drawingPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      }
      ctx.stroke();

      // Glowing markers along the line
      for (let i = 0; i < drawingPoints.length; i += 2) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(drawingPoints[i].x, drawingPoints[i].y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // B. Living soldiers following existing waypoint paths
    for (const sol of soldiers) {
      if (sol.team === 'player' && sol.waypointPath && sol.waypointPath.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sol.x, sol.y);
        for (const wp of sol.waypointPath) {
          ctx.lineTo(wp.x, wp.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. Draw Rally Point (集合地点指図)
    if (rallyPoint && rallyPoint.active) {
      ctx.save();
      const rx = rallyPoint.x;
      const ry = rallyPoint.y;

      // Radiating pulse ring
      const pulsePhase = (gameTime * 2) % 1;
      const pulseRadius = 25 + pulsePhase * 45;
      ctx.strokeStyle = `rgba(250, 204, 21, ${1 - pulsePhase})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rx, ry, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Ground beacon circle
      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.beginPath();
      ctx.arc(rx, ry, 22, 0, Math.PI * 2);
      ctx.fill();

      // Japanese War Banner (陣旗)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(rx - 3, ry - 38, 22, 28);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx - 3, ry - 38, 22, 28);

      // Flag pole
      ctx.fillStyle = '#78350f';
      ctx.fillRect(rx - 5, ry - 42, 3, 44);

      // Kanji on flag
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('令', rx + 8, ry - 20);

      // Text label
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('【全軍集結地点】', rx, ry - 46);

      ctx.restore();
    }

    // 7. Draw Soldiers (Authentic Sengoku Samurai / Archer / Cavalry / Sapper Sprites)
    for (const soldier of soldiers) {
      if (soldier.hp <= 0) continue;

      const isPlayer = soldier.team === 'player';
      const theme = NATION_THEMES[soldier.team] || NATION_THEMES['enemy'];
      const def = SOLDIER_DEFS[soldier.type];
      const isSelected = soldier.id === selectedSoldierId;

      ctx.save();
      ctx.translate(soldier.x, soldier.y);

      // Selection Aura (Rotating Golden Crest Ring)
      if (isSelected) {
        ctx.save();
        ctx.rotate(gameTime * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      // Dynamic unit bounce & march footstep phases
      const isMoving = soldier.speed > 0;
      const stepPhase = (gameTime * 9 + soldier.x * 0.1) % (Math.PI * 2);
      const walkBounce = isMoving ? Math.sin(stepPhase) * 1.5 : 0;
      const footSpread = isMoving ? Math.cos(stepPhase) * 4 : 0;

      // Rotate canvas according to soldier facing direction
      ctx.rotate(soldier.facing);

      if (soldier.type === 'cavalry') {
        // === CAVALRY (騎馬武者 & 駿馬) ===
        // 1. Horse Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 20, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Horse Gallop Legs
        const gallop = Math.sin(gameTime * 12);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        // Front legs
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(16 + gallop * 5, -8);
        ctx.moveTo(10, 5);
        ctx.lineTo(16 - gallop * 5, 8);
        // Back legs
        ctx.moveTo(-10, -5);
        ctx.lineTo(-16 - gallop * 4, -7);
        ctx.moveTo(-10, 5);
        ctx.lineTo(-16 + gallop * 4, 7);
        ctx.stroke();

        // 3. Horse Body (Chestnut Fur)
        ctx.fillStyle = '#78350f'; // Dark Chestnut brown
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Horse Mane & Tail
        ctx.strokeStyle = '#1e1b4b'; // Black hair
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.bezierCurveTo(-22, -4, -24, 4, -28, 0); // Tail
        ctx.stroke();

        // Horse Head & Neck
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(14, 0, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Horse Ears
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(13, -4);
        ctx.lineTo(16, -7);
        ctx.lineTo(15, -2);
        ctx.moveTo(13, 4);
        ctx.lineTo(16, 7);
        ctx.lineTo(15, 2);
        ctx.fill();

        // Horse Harness / Bridle (手綱 & 轡)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(11, -3, 6, 6);

        // Saddle (鞍 & 鐙)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -7, 12, 14);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-2, -8, 4, 16);

        // Mounted Samurai Rider Torso (陣羽織 & 甲冑)
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.ellipse(-1, 0, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Samurai Helmet (大兜)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Golden Maedate (鍬形・金角)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(5, -9);
        ctx.moveTo(2, 4);
        ctx.lineTo(5, 9);
        ctx.stroke();

        // Red Yari Lance (朱槍・長槍)
        ctx.strokeStyle = '#b91c1c'; // Vermilion shaft
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, 7);
        ctx.lineTo(24, 7);
        ctx.stroke();
        // Spearhead (銀白の穂先)
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(24, 7);
        ctx.lineTo(31, 7);
        ctx.lineTo(26, 4);
        ctx.lineTo(26, 10);
        ctx.closePath();
        ctx.fill();
        // Spear Tassel (赤房)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(23, 7, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (soldier.type === 'archer') {
        // === ARCHER (弓兵・陣笠と和弓) ===
        // 1. Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(0, 6, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Footsteps (草履 / 脚絆)
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-4 + footSpread, -9, 5, 3);
        ctx.fillRect(-4 - footSpread, 6, 5, 3);

        // 3. Body & Haori (直垂 & 陣羽織)
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4. Quiver & Arrows on Back (箙と矢羽)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-9, -5, 5, 10);
        // White fletchings (矢羽)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(-14, -6);
        ctx.moveTo(-9, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(-9, 3);
        ctx.lineTo(-14, 6);
        ctx.stroke();

        // 5. Conical Jingasa Hat (陣笠)
        ctx.fillStyle = '#1e293b'; // Black lacquer hat
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        // Gold rim & top boss (笠の縁と座金)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 6. Japanese Asymmetric Longbow (和弓)
        ctx.strokeStyle = '#b45309'; // Bamboo arc
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(8, 0, 11, -Math.PI / 2.8, Math.PI / 2.8);
        ctx.stroke();

        // Bowstring (白弦)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8 + Math.cos(-Math.PI / 2.8) * 11, Math.sin(-Math.PI / 2.8) * 11);
        ctx.lineTo(4, 0); // Pulled string notch
        ctx.lineTo(8 + Math.cos(Math.PI / 2.8) * 11, Math.sin(Math.PI / 2.8) * 11);
        ctx.stroke();

        // Nocked Arrow (番えた矢)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
      } else if (soldier.type === 'sapper') {
        // === SAPPER (破城工兵・火薬樽と大木槌) ===
        // 1. Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 7, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Footsteps
        ctx.fillStyle = '#334155';
        ctx.fillRect(-4 + footSpread, -9, 5, 3.5);
        ctx.fillRect(-4 - footSpread, 5.5, 5, 3.5);

        // 3. Powder Keg on Back (背負い火薬樽)
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.roundRect(-12, -6, 7, 12, 2);
        ctx.fill();
        // Barrel Iron Hoops (鉄のタガ)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -3);
        ctx.lineTo(-5, -3);
        ctx.moveTo(-12, 3);
        ctx.lineTo(-5, 3);
        ctx.stroke();
        // Burning Fuse Spark (導火線)
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-16, -7);
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-16, -7, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 4. Sturdy Torso & Work Apron (作業半纏)
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 5. Head with Hachimaki Band (ねじり鉢巻)
        ctx.fillStyle = '#fed7aa'; // Face
        ctx.beginPath();
        ctx.arc(1, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        // Twisted Red/White Headband (赤白鉢巻)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(1, 0, 6, -Math.PI / 1.5, Math.PI / 1.5);
        ctx.stroke();

        // 6. Giant War Sledgehammer (両手持ち大木槌)
        const hammerAngle = soldier.isAttacking ? Math.PI / 3 : 0;
        ctx.save();
        ctx.rotate(hammerAngle);
        // Wooden handle (樫の柄)
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(3, 4);
        ctx.lineTo(16, 4);
        ctx.stroke();
        // Heavy Iron Hammer Head (鉄の槌頭)
        ctx.fillStyle = '#475569';
        ctx.fillRect(14, -2, 7, 12);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(14, -2, 7, 12);
        ctx.restore();
      } else {
        // === SAMURAI (精鋭侍・兜前立・甲冑胴丸・日本刀) ===
        // 1. Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 7, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Footsteps (War Sandals 草履)
        ctx.fillStyle = '#44403c';
        ctx.fillRect(-4 + footSpread, -9, 5, 3);
        ctx.fillRect(-4 - footSpread, 6, 5, 3);

        // 3. Armor Body (胴丸甲冑 & 陣羽織)
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Gold Clan Mon on Chest (胸元の金家紋)
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Katana Sheath on Left Hip (腰の鞘)
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-3, -7);
        ctx.lineTo(-9, -12);
        ctx.stroke();

        // 4. Samurai Kabuto Helmet (戦国鉄兜 & 錣)
        ctx.fillStyle = '#0f172a'; // Iron bowl
        ctx.beginPath();
        ctx.arc(1, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Shikoro Neck Guard (二段錣)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(1, 0, 7.5, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();

        // Golden Crescent Maedate (前立・金色の弦月/三日月)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(3, 0, 6, -Math.PI / 2.3, Math.PI / 2.3);
        ctx.stroke();

        // 5. Drawn Katana Sword in Right Hand (白刃の日本刀)
        const swingAngle = soldier.isAttacking ? (Math.sin(gameTime * 25) * 0.8) : 0;
        ctx.save();
        ctx.rotate(swingAngle);

        // Sword Hilt & Tsuba (柄巻 & 鍔)
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(7, 5, 2.2, 0, Math.PI * 2); // Tsuba
        ctx.fill();

        // White-silver blade (白刃)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(8, 5);
        ctx.lineTo(21, 6);
        ctx.stroke();

        // Slashing arc trail if attacking
        if (soldier.isAttacking) {
          ctx.strokeStyle = 'rgba(191, 219, 254, 0.75)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(8, 5, 14, -Math.PI / 4, Math.PI / 4);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Soldier Tactical Stance Icon Badge (攻 / 守 / 遊)
      const stanceColor =
        soldier.stance === 'attack' ? '#ef4444' : soldier.stance === 'defense' ? '#3b82f6' : '#10b981';
      const stanceKanji =
        soldier.stance === 'attack' ? '攻' : soldier.stance === 'defense' ? '守' : '遊';

      ctx.fillStyle = stanceColor;
      ctx.beginPath();
      ctx.arc(soldier.x + 10, soldier.y - 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stanceKanji, soldier.x + 10, soldier.y - 11.5);

      // Soldier HP Bar (Sleek High-Contrast Mini Gauge)
      const barW = soldier.type === 'cavalry' ? 28 : 22;
      const barH = 3.5;
      const hpPct = Math.max(0, soldier.hp / soldier.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(soldier.x - barW / 2, soldier.y - 20, barW, barH);
      ctx.fillStyle = isPlayer ? '#38bdf8' : '#f87171';
      ctx.fillRect(soldier.x - barW / 2, soldier.y - 20, barW * hpPct, barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(soldier.x - barW / 2, soldier.y - 20, barW, barH);
    }

    // 8. Draw Projectiles
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'arrow') {
        const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        ctx.rotate(angle);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
      } else if (p.type === 'cannonball') {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === 'boulder') {
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire') {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 9. Draw Tactical Bomb (Incoming)
    if (tacticalBomb && !tacticalBomb.exploded) {
      ctx.save();
      // Target reticle on ground
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tacticalBomb.targetX, tacticalBomb.targetY, BOMB_CONFIG.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.arc(tacticalBomb.targetX, tacticalBomb.targetY, BOMB_CONFIG.radius, 0, Math.PI * 2);
      ctx.fill();

      // Falling bomb projectile
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(tacticalBomb.targetX, tacticalBomb.currentY, 8, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // 10. Draw Particles
    for (const part of particles) {
      ctx.save();
      const alpha = Math.max(0, part.life / part.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 11. Draw Damage Numbers & Float Text
    for (const d of damageNumbers) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.opacity);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const label = d.text ? `${d.text} ${d.damage > 0 ? d.damage : ''}` : `-${d.damage}`;
      ctx.fillText(label, d.x, d.y);
      ctx.restore();
    }

    // 12. Reticle Preview for Tactical Bomb or Rally Point targeting
    if (hoverPos) {
      ctx.save();
      if (isBombTargeting) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, BOMB_CONFIG.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, BOMB_CONFIG.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💣 クリックで爆撃投下！', hoverPos.x, hoverPos.y - BOMB_CONFIG.radius - 8);
      } else if (isRallyTargeting) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, 35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚩 クリックで全軍集合！', hoverPos.x, hoverPos.y - 42);
      } else if (isPathDrawing) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✍️ ドラッグで進軍路を描画', hoverPos.x, hoverPos.y - 16);
      } else if (phase === 'build' && selectedItem) {
        // Placement ghost preview
        const valid = isValidBuildPos(hoverPos.x, hoverPos.y) && playerBudget >= selectedItem.cost;
        ctx.strokeStyle = valid ? '#22c55e' : '#ef4444';
        ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 13. MINI-MAP RADAR DISPLAY (Corner Overview)
    const mmW = 160;
    const mmH = 100;
    const mmX = fieldWidth - mmW - 14;
    const mmY = fieldHeight - mmH - 14;
    const scaleX = mmW / fieldWidth;
    const scaleY = mmH / fieldHeight;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmW, mmH, 8);
    ctx.fill();
    ctx.stroke();

    // Mini terrain zones
    for (const z of terrainZones) {
      ctx.fillStyle = z.type === 'swamp' ? '#3d2817' : '#7dd3fc';
      ctx.fillRect(mmX + z.x * scaleX, mmY + z.y * scaleY, z.width * scaleX, z.height * scaleY);
    }

    // Mini objectives
    for (const st of structures) {
      if (!st.isObjective || st.hp <= 0) continue;
      const theme = NATION_THEMES[st.team] || NATION_THEMES['enemy'];
      ctx.fillStyle = theme.primary;
      const dotSize = st.objectiveType === 'honjin' ? 6 : 4;
      ctx.beginPath();
      ctx.arc(mmX + st.x * scaleX, mmY + st.y * scaleY, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini soldiers
    for (const s of soldiers) {
      if (s.hp <= 0) continue;
      const theme = NATION_THEMES[s.team] || NATION_THEMES['enemy'];
      ctx.fillStyle = theme.primary;
      ctx.fillRect(mmX + s.x * scaleX - 1, mmY + s.y * scaleY - 1, 2, 2);
    }

    // Mini-map title
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('全域レーダー', mmX + 6, mmY + 12);

    ctx.restore();
  }, [
    phase,
    structures,
    soldiers,
    projectiles,
    damageNumbers,
    particles,
    respawnQueue,
    tacticalBomb,
    selectedItem,
    selectedStance,
    playerBudget,
    hoverPos,
    isValidBuildPos,
    selectedSoldierId,
    isBombTargeting,
    gameTime,
    gameMode,
    modeConfig,
    terrainZones,
    fieldWidth,
    fieldHeight,
    playerBuildZone,
    rallyPoint,
    isRallyTargeting,
    isPathDrawing,
    drawingPoints,
  ]);

  // Continuous wall drag handler
  const handleDragPlacement = (x: number, y: number) => {
    if (phase !== 'build' || !selectedItem || selectedItem.category !== 'wall') return;

    for (const s of structures) {
      if (Math.hypot(s.x - x, s.y - y) < 22) return;
    }

    if (!lastPlacedPosRef.current) {
      if (isValidBuildPos(x, y) && playerBudget >= selectedItem.cost) {
        const ok = onPlaceWallSegment(x, y);
        if (ok) lastPlacedPosRef.current = { x, y };
      }
    } else {
      const d = Math.hypot(x - lastPlacedPosRef.current.x, y - lastPlacedPosRef.current.y);
      if (d >= 36) {
        if (isValidBuildPos(x, y) && playerBudget >= selectedItem.cost) {
          const ok = onPlaceWallSegment(x, y);
          if (ok) lastPlacedPosRef.current = { x, y };
        }
      }
    }
  };

  // Mouse & Pointer handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (touchHandledRef.current) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    pointerStartRef.current = { x: coords.x, y: coords.y, time: Date.now() };
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;

    if (isBombTargeting) {
      onDropBomb(coords.x, coords.y);
      return;
    }

    if (isRallyTargeting && onSetRallyPoint) {
      onSetRallyPoint(coords.x, coords.y);
      return;
    }

    if (isPathDrawing) {
      isDrawingPathRef.current = true;
      setDrawingPoints([{ x: coords.x, y: coords.y }]);
      return;
    }

    if (phase === 'build' && selectedItem?.category === 'wall') {
      isDraggingRef.current = true;
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    setHoverPos(coords);

    if (isPathDrawing && isDrawingPathRef.current) {
      setDrawingPoints(prev => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(coords.x - last.x, coords.y - last.y) >= 20) {
          return [...prev, { x: coords.x, y: coords.y }];
        }
        return prev;
      });
      return;
    }

    if (isDraggingRef.current && phase === 'build') {
      hasDraggedRef.current = true;
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleMouseUp = () => {
    if (isPathDrawing && isDrawingPathRef.current) {
      isDrawingPathRef.current = false;
      if (drawingPoints.length >= 2 && onPathDrawn) {
        onPathDrawn(drawingPoints);
      }
      setDrawingPoints([]);
      return;
    }

    if (!hasDraggedRef.current && pointerStartRef.current) {
      const { x, y } = pointerStartRef.current;
      handleSingleClick(x, y);
    }

    isDraggingRef.current = false;
    pointerStartRef.current = null;
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;
  };

  const handleSingleClick = (x: number, y: number) => {
    // Select friendly soldier
    const clickedSoldier = soldiers.find(
      s => s.team === 'player' && s.hp > 0 && Math.hypot(s.x - x, s.y - y) <= 24
    );
    if (clickedSoldier) {
      onSelectSoldier(clickedSoldier.id);
      return;
    }

    // Build phase refund
    if (phase === 'build') {
      const clickedStruct = structures.find(
        s => s.team === 'player' && !s.isObjective && Math.hypot(s.x - x, s.y - y) <= s.width / 2 + 10
      );
      if (clickedStruct) {
        onRefundStructure(clickedStruct.id);
        return;
      }

      if (selectedItem) {
        if (selectedItem.category === 'soldier') {
          onPlaceSoldier(x, y);
        } else {
          onPlaceStructure(x, y);
        }
      }
    } else {
      onSelectSoldier(null);
    }
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    touchHandledRef.current = true;
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (!coords) return;

    pointerStartRef.current = { x: coords.x, y: coords.y, time: Date.now() };
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;

    if (isBombTargeting) {
      onDropBomb(coords.x, coords.y);
      return;
    }

    if (isRallyTargeting && onSetRallyPoint) {
      onSetRallyPoint(coords.x, coords.y);
      return;
    }

    if (isPathDrawing) {
      isDrawingPathRef.current = true;
      setDrawingPoints([{ x: coords.x, y: coords.y }]);
      return;
    }

    if (phase === 'build' && selectedItem?.category === 'wall') {
      isDraggingRef.current = true;
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (!coords) return;

    if (isPathDrawing && isDrawingPathRef.current) {
      setDrawingPoints(prev => {
        const last = prev[prev.length - 1];
        if (!last || Math.hypot(coords.x - last.x, coords.y - last.y) >= 20) {
          return [...prev, { x: coords.x, y: coords.y }];
        }
        return prev;
      });
      return;
    }

    if (isDraggingRef.current && phase === 'build') {
      hasDraggedRef.current = true;
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleTouchEnd = () => {
    if (isPathDrawing && isDrawingPathRef.current) {
      isDrawingPathRef.current = false;
      if (drawingPoints.length >= 2 && onPathDrawn) {
        onPathDrawn(drawingPoints);
      }
      setDrawingPoints([]);
      touchHandledRef.current = false;
      return;
    }

    if (!hasDraggedRef.current && pointerStartRef.current) {
      const { x, y } = pointerStartRef.current;
      handleSingleClick(x, y);
    }

    isDraggingRef.current = false;
    pointerStartRef.current = null;
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;

    setTimeout(() => {
      touchHandledRef.current = false;
    }, 250);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl touch-none">
      <canvas
        ref={canvasRef}
        width={fieldWidth}
        height={fieldHeight}
        className="w-full h-auto cursor-crosshair block select-none touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
