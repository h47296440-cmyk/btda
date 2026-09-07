import React, { useRef, useEffect, useCallback } from 'react';
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
} from '../types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  STANCE_INFO,
  BOMB_CONFIG,
} from '../gameConfig';

interface BattleCanvasProps {
  phase: GamePhase;
  structures: Structure[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  respawnQueue: RespawnQueueItem[];
  tacticalBomb: TacticalBomb | null;
  selectedItem: { id: string; category: 'wall' | 'turret' | 'soldier'; cost: number } | null;
  selectedStance: SoldierStance;
  playerBudget: number;
  hoverPos: { x: number; y: number } | null;
  setHoverPos: (pos: { x: number; y: number } | null) => void;
  onCanvasClick: (x: number, y: number) => void;
  onPlaceWallSegment: (x: number, y: number) => boolean; // For continuous drag tracing
  selectedSoldierId: string | null;
  onSelectSoldier: (id: string | null) => void;
  isBombTargeting: boolean;
  onDropBomb: (x: number, y: number) => void;
  gameTime: number;
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
  hoverPos,
  setHoverPos,
  onCanvasClick,
  onPlaceWallSegment,
  selectedSoldierId,
  onSelectSoldier,
  isBombTargeting,
  onDropBomb,
  gameTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastPlacedPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const touchHandledRef = useRef<boolean>(false);

  // Helper to check valid build position
  const isValidBuildPos = useCallback(
    (x: number, y: number): boolean => {
      if (
        x < PLAYER_BUILD_ZONE.minX ||
        x > PLAYER_BUILD_ZONE.maxX ||
        y < PLAYER_BUILD_ZONE.minY ||
        y > PLAYER_BUILD_ZONE.maxY
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
    [structures]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 1. Draw Battlefield Background
    const grassGrad = ctx.createLinearGradient(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    grassGrad.addColorStop(0, '#234a1f');
    grassGrad.addColorStop(0.5, '#305f28');
    grassGrad.addColorStop(1, '#234a1f');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Subtle grass texture
    ctx.fillStyle = 'rgba(20, 45, 18, 0.45)';
    for (let i = 0; i < 50; i++) {
      const gx = (i * 103) % FIELD_WIDTH;
      const gy = (i * 137) % FIELD_HEIGHT;
      ctx.fillRect(gx, gy, 4, 3);
    }

    // Moat / River in center
    const riverW = 100;
    const riverX = FIELD_WIDTH / 2 - riverW / 2;
    const waterGrad = ctx.createLinearGradient(riverX, 0, riverX + riverW, 0);
    waterGrad.addColorStop(0, '#172554');
    waterGrad.addColorStop(0.5, '#2563eb');
    waterGrad.addColorStop(1, '#172554');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(riverX, 0, riverW, FIELD_HEIGHT);

    // Water ripple lines
    ctx.strokeStyle = 'rgba(191, 219, 254, 0.35)';
    ctx.lineWidth = 1.5;
    const waveOffset = (gameTime * 28) % 60;
    for (let wy = -60; wy < FIELD_HEIGHT + 60; wy += 35) {
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

    // Bridges over the moat
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
    drawBridge(FIELD_HEIGHT - 208);

    // Castle Grounds
    ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
    ctx.beginPath();
    ctx.roundRect(PLAYER_BUILD_ZONE.minX, PLAYER_BUILD_ZONE.minY, PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX, PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY, 16);
    ctx.fill();

    ctx.fillStyle = 'rgba(79, 44, 44, 0.45)';
    ctx.beginPath();
    ctx.roundRect(FIELD_WIDTH - PLAYER_BUILD_ZONE.maxX, PLAYER_BUILD_ZONE.minY, PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX, PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY, 16);
    ctx.fill();

    // In build phase: Highlight player placement zone & Drag guidance
    if (phase === 'build') {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(
        PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.minY,
        PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY
      );

      ctx.fillStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('【味方築城エリア】壁のみドラッグ（なぞり）で連続配置可能！砲台・兵士はクリックで配置', PLAYER_BUILD_ZONE.minX + 16, PLAYER_BUILD_ZONE.minY + 24);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.strokeRect(
        FIELD_WIDTH - PLAYER_BUILD_ZONE.maxX,
        PLAYER_BUILD_ZONE.minY,
        PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY
      );
      ctx.fillStyle = 'rgba(252, 165, 165, 0.7)';
      ctx.fillText('【敵陣営エリア】', FIELD_WIDTH - PLAYER_BUILD_ZONE.maxX + 16, PLAYER_BUILD_ZONE.minY + 24);
      ctx.restore();
    }

    // 2. Draw Structures
    for (const struct of structures) {
      const isPlayer = struct.team === 'player';
      const isDestroyed = struct.hp <= 0;

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
            ctx.fillStyle = isPlayer ? '#1e3a8a' : '#7f1d1d';
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

            // Gold Crest Ornament
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, -size * 0.55, 6, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isPlayer ? '本陣 (自軍)' : '本陣 (敵軍)', 0, size * 0.22);

            // INVULNERABLE SHIELD BARRIER
            if (struct.isInvulnerable) {
              const barrierPulse = 1 + Math.sin(gameTime * 4) * 0.05;
              const radius = size * 0.68 * barrierPulse;

              ctx.strokeStyle = isPlayer ? 'rgba(59, 130, 246, 0.85)' : 'rgba(239, 68, 68, 0.85)';
              ctx.lineWidth = 3;
              ctx.setLineDash([6, 4]);
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = isPlayer ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = isPlayer ? '#93c5fd' : '#fca5a5';
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
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${maruName} (陥落)`, 0, 4);
          } else {
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.roundRect(-size / 2, -size / 2, size, size, 8);
            ctx.fill();

            ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
            ctx.beginPath();
            ctx.roundRect(-size * 0.35, -size * 0.35, size * 0.7, size * 0.7, 4);
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.fillRect(-2, -size * 0.5, 4, size * 0.3);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(maruName, 0, 4);
          }
        }
      } else if (struct.type.includes('wall')) {
        const w = struct.width;
        const h = struct.height;

        if (struct.type === 'wood_wall') {
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#543108';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.beginPath();
          ctx.moveTo(-w / 6, -h / 2);
          ctx.lineTo(-w / 6, h / 2);
          ctx.moveTo(w / 6, -h / 2);
          ctx.lineTo(w / 6, h / 2);
          ctx.stroke();
        } else if (struct.type === 'stone_wall') {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.beginPath();
          ctx.moveTo(-w / 2, 0);
          ctx.lineTo(w / 2, 0);
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(0, 0);
          ctx.stroke();
        } else if (struct.type === 'iron_wall') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-w / 3, -h / 3, 4, 4);
          ctx.fillRect(w / 3 - 4, -h / 3, 4, 4);
          ctx.fillRect(-w / 3, h / 3 - 4, 4, 4);
          ctx.fillRect(w / 3 - 4, h / 3 - 4, 4, 4);
        } else if (struct.type === 'spike_wall') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = '#dc2626';
          const spikeDir = isPlayer ? 1 : -1;
          for (let sy = -h / 3; sy <= h / 3; sy += 10) {
            ctx.beginPath();
            ctx.moveTo((w / 2) * spikeDir, sy - 3);
            ctx.lineTo((w / 2 + 10) * spikeDir, sy);
            ctx.lineTo((w / 2) * spikeDir, sy + 3);
            ctx.fill();
          }
        }
      } else {
        // Turrets
        const size = struct.width;
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (struct.type === 'arrow_tower') {
          ctx.fillStyle = isPlayer ? '#0284c7' : '#b91c1c';
          ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI);
          ctx.stroke();
        } else if (struct.type === 'cannon_battery') {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
          ctx.fill();

          const barrelAngle = isPlayer ? 0 : Math.PI;
          ctx.save();
          ctx.rotate(barrelAngle);
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, -5, size * 0.45, 10);
          ctx.restore();
        } else if (struct.type === 'catapult') {
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(-6, -size * 0.4, 12, size * 0.8);
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.arc(0, -size * 0.35, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (struct.type === 'fire_tower') {
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw HP Bar
      if (struct.hp > 0) {
        const barW = Math.max(34, struct.width);
        const barH = 5;
        const barY = -struct.height / 2 - 9;
        const hpPercent = Math.max(0, struct.hp / struct.maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(-barW / 2, barY, barW, barH);

        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(-barW / 2, barY, barW * hpPercent, barH);
      }

      ctx.restore();
    }

    // 3. Draw Soldiers
    for (const sol of soldiers) {
      if (sol.hp <= 0) continue;

      const isPlayer = sol.team === 'player';
      const isSelected = selectedSoldierId === sol.id;

      ctx.save();
      ctx.translate(sol.x, sol.y);

      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 9, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -3, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(sol.facing);
      if (sol.type === 'samurai') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
      } else if (sol.type === 'archer') {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, 0, 7, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (sol.type === 'sapper') {
        ctx.fillStyle = '#78716c';
        ctx.fillRect(10, -5, 8, 10);
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
      } else if (sol.type === 'cavalry') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();
      }
      ctx.restore();

      const stance = STANCE_INFO[sol.stance];
      ctx.fillStyle = stance.color;
      ctx.beginPath();
      ctx.arc(0, -16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stance.badge, 0, -16);

      const hpPct = Math.max(0, sol.hp / sol.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-12, -26, 24, 3);
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-12, -26, 24 * hpPct, 3);

      ctx.restore();
    }

    // 4. Draw Projectiles
    for (const p of projectiles) {
      ctx.save();
      const arcOffset = Math.sin(p.progress * Math.PI) * p.arcHeight;
      const curY = p.y - arcOffset;

      if (p.type === 'arrow') {
        const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        ctx.translate(p.x, curY);
        ctx.rotate(angle);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(14, 0);
        ctx.lineTo(10, 2);
        ctx.fill();
      } else if (p.type === 'cannonball') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(p.x, curY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x - 6, curY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'boulder') {
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(p.x, curY, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Draw Tactical Bomb (Falling Airstrike Animation)
    if (tacticalBomb && !tacticalBomb.exploded) {
      ctx.save();
      // Target Reticle on the ground
      const pulse = (Math.sin(gameTime * 10) + 1) / 2;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tacticalBomb.targetX, tacticalBomb.targetY, BOMB_CONFIG.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(tacticalBomb.targetX, tacticalBomb.targetY, BOMB_CONFIG.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bomb shadow growing as it approaches
      const shadowSize = 10 + 20 * tacticalBomb.progress;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(tacticalBomb.targetX, tacticalBomb.targetY, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Falling missile / bomb
      ctx.translate(tacticalBomb.targetX, tacticalBomb.currentY);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-8, -20, 16, 32, 6);
      ctx.fill();
      // Fin
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-12, -22, 24, 6);
      // Flame trail
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, -26, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 6. Draw Respawn Queue Indicators (15秒で復活の演出)
    const playerRespawning = respawnQueue.filter(r => r.team === 'player');
    const enemyRespawning = respawnQueue.filter(r => r.team === 'enemy');

    if (playerRespawning.length > 0) {
      ctx.save();
      const nextTime = Math.max(0, Math.ceil(Math.min(...playerRespawning.map(r => r.respawnTime)) - gameTime));
      ctx.fillStyle = 'rgba(30, 58, 138, 0.85)';
      ctx.beginPath();
      ctx.roundRect(40, FIELD_HEIGHT - 65, 180, 32, 8);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⟳ 味方兵復活中: ${nextTime}秒 (${playerRespawning.length}名)`, 50, FIELD_HEIGHT - 44);
      ctx.restore();
    }

    if (enemyRespawning.length > 0) {
      ctx.save();
      const nextTime = Math.max(0, Math.ceil(Math.min(...enemyRespawning.map(r => r.respawnTime)) - gameTime));
      ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
      ctx.beginPath();
      ctx.roundRect(FIELD_WIDTH - 220, FIELD_HEIGHT - 65, 180, 32, 8);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⟳ 敵兵復活中: ${nextTime}秒 (${enemyRespawning.length}名)`, FIELD_WIDTH - 210, FIELD_HEIGHT - 44);
      ctx.restore();
    }

    // 7. Draw Particles
    for (const part of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Draw Damage Float Numbers
    for (const d of damageNumbers) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.opacity);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      const text = d.text ? `${d.text} -${d.damage}` : `-${d.damage}`;
      ctx.fillText(text, d.x, d.y);
      ctx.restore();
    }

    // 9. Bomb Target Reticle Mode
    if (isBombTargeting && hoverPos) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, BOMB_CONFIG.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();
      ctx.setLineDash([]);

      // Crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hoverPos.x - 20, hoverPos.y);
      ctx.lineTo(hoverPos.x + 20, hoverPos.y);
      ctx.moveTo(hoverPos.x, hoverPos.y - 20);
      ctx.lineTo(hoverPos.x, hoverPos.y + 20);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💣 クリックで爆撃投下！', hoverPos.x, hoverPos.y - BOMB_CONFIG.radius - 8);
      ctx.restore();
    }

    // 10. Draw Build Hover Placement Preview
    if (phase === 'build' && selectedItem && hoverPos && !isBombTargeting) {
      const valid = isValidBuildPos(hoverPos.x, hoverPos.y) && playerBudget >= selectedItem.cost;
      ctx.save();
      ctx.translate(hoverPos.x, hoverPos.y);

      ctx.strokeStyle = valid ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (selectedItem.category === 'soldier') {
        const stance = STANCE_INFO[selectedStance];
        ctx.fillStyle = stance.color;
        ctx.beginPath();
        ctx.arc(0, -18, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stance.badge, 0, -18);
      } else if (selectedItem.category === 'wall') {
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ドラッグで引く', 0, -24);
      }

      ctx.restore();
    }
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
  ]);

  // Coordinate conversion helper
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_WIDTH / rect.width;
    const scaleY = FIELD_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Helper to check if pointer is hovering over an existing interactive item (soldier select or refund)
  const isOverInteractiveItem = (x: number, y: number) => {
    const clickedSoldier = soldiers.find(
      s => s.team === 'player' && s.hp > 0 && Math.hypot(s.x - x, s.y - y) <= 24
    );
    if (clickedSoldier) return { type: 'soldier', id: clickedSoldier.id };

    if (phase === 'build') {
      const clickedStruct = structures.find(
        s => s.team === 'player' && !s.isObjective && Math.hypot(s.x - x, s.y - y) <= s.width / 2 + 10
      );
      if (clickedStruct) return { type: 'structure', id: clickedStruct.id };
    }
    return null;
  };

  // Continuous wall drag handler (STRICTLY ONLY FOR WALLS)
  const handleDragPlacement = (x: number, y: number) => {
    if (phase !== 'build' || !selectedItem || selectedItem.category !== 'wall') return;

    // Do not place if directly on an existing structure
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

  // Mouse Events
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

    // STRICT: ONLY wall category is allowed continuous dragging/tracing!
    if (phase === 'build' && selectedItem?.category === 'wall') {
      const interactive = isOverInteractiveItem(coords.x, coords.y);
      if (!interactive) {
        isDraggingRef.current = true;
        handleDragPlacement(coords.x, coords.y);
      }
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    setHoverPos(coords);

    if (pointerStartRef.current) {
      const d = Math.hypot(coords.x - pointerStartRef.current.x, coords.y - pointerStartRef.current.y);
      if (d > 12) {
        hasDraggedRef.current = true;
      }
    }

    // STRICT: ONLY WALLS CAN BE DRAGGED/TRACED
    if (isDraggingRef.current && phase === 'build' && selectedItem?.category === 'wall') {
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (touchHandledRef.current) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (coords && pointerStartRef.current) {
      const totalMove = Math.hypot(coords.x - pointerStartRef.current.x, coords.y - pointerStartRef.current.y);
      
      // If clicking soldier during battle
      const clickedSoldier = soldiers.find(
        s => s.team === 'player' && s.hp > 0 && Math.hypot(s.x - coords.x, s.y - coords.y) <= 24
      );

      if (clickedSoldier && totalMove < 24) {
        onSelectSoldier(clickedSoldier.id);
      } else if (phase === 'build') {
        if (selectedItem?.category !== 'wall') {
          // Turrets and Soldiers: STRICTLY SINGLE CLICK PLACEMENT (no tracing/dragging)
          // As long as mouse didn't drag extensively across canvas
          if (totalMove < 30) {
            onCanvasClick(coords.x, coords.y);
          }
        } else {
          // Wall: if clicked without dragging, place a single wall node or refund if existing
          if (!hasDraggedRef.current && totalMove < 15) {
            const existing = structures.find(
              s => s.team === 'player' && !s.isObjective && Math.hypot(s.x - coords.x, s.y - coords.y) <= s.width / 2 + 10
            );
            if (existing) {
              onCanvasClick(coords.x, coords.y);
            }
          }
        }
      }
    }

    isDraggingRef.current = false;
    pointerStartRef.current = null;
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;
  };

  // Touch Events for Mobile (Wall dragging & single taps for turrets/soldiers)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    touchHandledRef.current = true;
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (!coords) return;

    pointerStartRef.current = { x: coords.x, y: coords.y, time: Date.now() };
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;
    setHoverPos(coords);

    if (isBombTargeting) {
      onDropBomb(coords.x, coords.y);
      return;
    }

    // STRICT: Only wall category enters drag placement!
    if (phase === 'build' && selectedItem?.category === 'wall') {
      const interactive = isOverInteractiveItem(coords.x, coords.y);
      if (!interactive) {
        isDraggingRef.current = true;
        handleDragPlacement(coords.x, coords.y);
      }
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (!coords) return;
    setHoverPos(coords);

    if (pointerStartRef.current) {
      const d = Math.hypot(coords.x - pointerStartRef.current.x, coords.y - pointerStartRef.current.y);
      if (d > 12) {
        hasDraggedRef.current = true;
      }
    }

    // STRICT: ONLY WALLS CAN BE DRAGGED/TRACED!
    if (isDraggingRef.current && phase === 'build' && selectedItem?.category === 'wall') {
      handleDragPlacement(coords.x, coords.y);
    }
  };

  const handleTouchEnd = () => {
    if (!pointerStartRef.current) return;
    const { x, y } = pointerStartRef.current;

    // Check soldier selection
    const clickedSoldier = soldiers.find(
      s => s.team === 'player' && s.hp > 0 && Math.hypot(s.x - x, s.y - y) <= 24
    );

    if (clickedSoldier && !hasDraggedRef.current) {
      onSelectSoldier(clickedSoldier.id);
    } else if (phase === 'build') {
      if (selectedItem?.category !== 'wall') {
        // Turrets and soldiers: 1-click single placement
        if (!hasDraggedRef.current) {
          onCanvasClick(x, y);
        }
      } else {
        // Tapping existing item with wall tool triggers refund
        if (!hasDraggedRef.current) {
          const existing = structures.find(
            s => s.team === 'player' && !s.isObjective && Math.hypot(s.x - x, s.y - y) <= s.width / 2 + 10
          );
          if (existing) {
            onCanvasClick(x, y);
          }
        }
      }
    }

    isDraggingRef.current = false;
    pointerStartRef.current = null;
    hasDraggedRef.current = false;
    lastPlacedPosRef.current = null;

    setTimeout(() => {
      touchHandledRef.current = false;
    }, 300);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl touch-none">
      <canvas
        ref={canvasRef}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
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
