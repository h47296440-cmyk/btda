import React, { useRef, useEffect, useCallback } from 'react';
import {
  Structure,
  Soldier,
  Projectile,
  DamageNumber,
  Particle,
  GamePhase,
  SoldierStance,
} from '../types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER_BUILD_ZONE,
  STANCE_INFO,
} from '../gameConfig';

interface BattleCanvasProps {
  phase: GamePhase;
  structures: Structure[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  selectedItem: { id: string; category: 'wall' | 'turret' | 'soldier'; cost: number } | null;
  selectedStance: SoldierStance;
  playerBudget: number;
  hoverPos: { x: number; y: number } | null;
  setHoverPos: (pos: { x: number; y: number } | null) => void;
  onCanvasClick: (x: number, y: number) => void;
  selectedSoldierId: string | null;
  onSelectSoldier: (id: string | null) => void;
  gameTime: number;
}

export const BattleCanvas: React.FC<BattleCanvasProps> = ({
  phase,
  structures,
  soldiers,
  projectiles,
  damageNumbers,
  particles,
  selectedItem,
  selectedStance,
  playerBudget,
  hoverPos,
  setHoverPos,
  onCanvasClick,
  selectedSoldierId,
  onSelectSoldier,
  gameTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      // Check collision with existing structures
      for (const st of structures) {
        if (st.team === 'player' && Math.hypot(st.x - x, st.y - y) < (st.width / 2 + 18)) {
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

    // Clear Canvas
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 1. Draw Battlefield Background
    // Grassland terrain
    const grassGrad = ctx.createLinearGradient(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    grassGrad.addColorStop(0, '#2d5a27');
    grassGrad.addColorStop(0.5, '#3b6f34');
    grassGrad.addColorStop(1, '#2d5a27');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Subtle terrain texture / stones / grass blades
    ctx.fillStyle = 'rgba(30, 60, 25, 0.4)';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 97) % FIELD_WIDTH;
      const gy = (i * 131) % FIELD_HEIGHT;
      ctx.fillRect(gx, gy, 4, 3);
    }

    // Moat / River in the center
    const riverX = FIELD_WIDTH / 2 - 45;
    const riverW = 90;
    const waterGrad = ctx.createLinearGradient(riverX, 0, riverX + riverW, 0);
    waterGrad.addColorStop(0, '#1e3a5f');
    waterGrad.addColorStop(0.5, '#2563eb');
    waterGrad.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(riverX, 0, riverW, FIELD_HEIGHT);

    // Water ripple lines
    ctx.strokeStyle = 'rgba(191, 219, 254, 0.35)';
    ctx.lineWidth = 1.5;
    const waveOffset = (gameTime * 25) % 60;
    for (let wy = -60; wy < FIELD_HEIGHT + 60; wy += 35) {
      ctx.beginPath();
      ctx.moveTo(riverX + 10, wy + waveOffset);
      ctx.bezierCurveTo(
        riverX + 30,
        wy + waveOffset - 6,
        riverX + 60,
        wy + waveOffset + 6,
        riverX + riverW - 10,
        wy + waveOffset
      );
      ctx.stroke();
    }

    // Wooden Bridges over the river (North Bridge and South Bridge)
    const drawBridge = (by: number) => {
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(riverX - 6, by, riverW + 12, 54);
      // Planks
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      for (let bx = riverX - 4; bx <= riverX + riverW + 4; bx += 10) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + 54);
        ctx.stroke();
      }
      // Railings
      ctx.fillStyle = '#713f12';
      ctx.fillRect(riverX - 8, by - 3, riverW + 16, 5);
      ctx.fillRect(riverX - 8, by + 52, riverW + 16, 5);
    };

    drawBridge(140);
    drawBridge(FIELD_HEIGHT - 194);

    // Player & Enemy Castle Grounds (Cobblestone / tatami grounds)
    // Player ground (left)
    ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
    ctx.beginPath();
    ctx.roundRect(30, 30, 430, FIELD_HEIGHT - 60, 16);
    ctx.fill();

    // Enemy ground (right)
    ctx.fillStyle = 'rgba(79, 44, 44, 0.45)';
    ctx.beginPath();
    ctx.roundRect(FIELD_WIDTH - 460, 30, 430, FIELD_HEIGHT - 60, 16);
    ctx.fill();

    // In build phase: Highlight player placement zone
    if (phase === 'build') {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(
        PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.minY,
        PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY
      );

      // Label
      ctx.fillStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('【味方築城エリア】', PLAYER_BUILD_ZONE.minX + 12, PLAYER_BUILD_ZONE.minY + 22);

      // Enemy zone label
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.strokeRect(
        FIELD_WIDTH - 460,
        PLAYER_BUILD_ZONE.minY,
        PLAYER_BUILD_ZONE.maxX - PLAYER_BUILD_ZONE.minX,
        PLAYER_BUILD_ZONE.maxY - PLAYER_BUILD_ZONE.minY
      );
      ctx.fillStyle = 'rgba(252, 165, 165, 0.7)';
      ctx.fillText('【敵陣営エリア】', FIELD_WIDTH - 440, PLAYER_BUILD_ZONE.minY + 22);
      ctx.restore();
    }

    // 2. Draw Structures
    for (const struct of structures) {
      const isPlayer = struct.team === 'player';
      const isDestroyed = struct.hp <= 0;

      ctx.save();
      ctx.translate(struct.x, struct.y);

      if (struct.isObjective) {
        // Honjin (Keep) or Maru (Bastion)
        if (struct.objectiveType === 'honjin') {
          // --- HONJIN (天守閣・本陣) ---
          const size = struct.width;

          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(0, size * 0.35, size * 0.55, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();

          if (isDestroyed) {
            // Destroyed Honjin Rubble
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

            // Japanese Hip-and-Gable Roof (Eaves)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.7);
            ctx.lineTo(size * 0.55, -size * 0.38);
            ctx.lineTo(size * 0.45, -size * 0.35);
            ctx.lineTo(-size * 0.45, -size * 0.35);
            ctx.lineTo(-size * 0.55, -size * 0.38);
            ctx.closePath();
            ctx.fill();

            // Gold Crest Ornament (鯱・家紋)
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, -size * 0.55, 6, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isPlayer ? '本陣 (自軍)' : '本陣 (敵軍)', 0, size * 0.22);

            // INVULNERABLE SHIELD BARRIER AROUND HONJIN
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

              // Glowing rune field
              ctx.fillStyle = isPlayer ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();

              // Barrier Tag
              ctx.fillStyle = isPlayer ? '#93c5fd' : '#fca5a5';
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText('結界無敵 (二丸破壊で解除)', 0, -size * 0.75);
            } else {
              // Barrier Broken Warning!
              const pulse = (Math.sin(gameTime * 8) + 1) / 2;
              ctx.strokeStyle = `rgba(234, 88, 12, ${0.4 + pulse * 0.5})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = '#f97316';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText('★ 攻撃可能！ ★', 0, -size * 0.75);
            }
          }
        } else {
          // --- MARU 1 / MARU 2 (二の丸・三の丸) ---
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
            // Bastion Stone Platform
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.roundRect(-size / 2, -size / 2, size, size, 8);
            ctx.fill();

            // Crenels / Watchtower roof
            ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
            ctx.beginPath();
            ctx.roundRect(-size * 0.35, -size * 0.35, size * 0.7, size * 0.7, 4);
            ctx.fill();

            // Banner pole
            ctx.fillStyle = '#d97706';
            ctx.fillRect(-2, -size * 0.5, 4, size * 0.3);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(maruName, 0, 4);
          }
        }
      } else if (struct.type.includes('wall')) {
        // --- WALLS (壁・防壁) ---
        const w = struct.width;
        const h = struct.height;

        if (struct.type === 'wood_wall') {
          // Wood logs
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#543108';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          // Vertical log dividers
          ctx.beginPath();
          ctx.moveTo(-w / 6, -h / 2);
          ctx.lineTo(-w / 6, h / 2);
          ctx.moveTo(w / 6, -h / 2);
          ctx.lineTo(w / 6, h / 2);
          ctx.stroke();
        } else if (struct.type === 'stone_wall') {
          // Stone bricks
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          // Brick pattern
          ctx.beginPath();
          ctx.moveTo(-w / 2, 0);
          ctx.lineTo(w / 2, 0);
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(0, 0);
          ctx.stroke();
        } else if (struct.type === 'iron_wall') {
          // Reinforced Iron Plate
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          // Rivets
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-w / 3, -h / 3, 4, 4);
          ctx.fillRect(w / 3 - 4, -h / 3, 4, 4);
          ctx.fillRect(-w / 3, h / 3 - 4, 4, 4);
          ctx.fillRect(w / 3 - 4, h / 3 - 4, 4, 4);
        } else if (struct.type === 'spike_wall') {
          // Spike Wall
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          // Spikes sticking out
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
        // --- TURRETS (砲台・矢倉・カタパルト) ---
        const size = struct.width;

        // Base foundation
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (struct.type === 'arrow_tower') {
          // Watchtower roof
          ctx.fillStyle = isPlayer ? '#0284c7' : '#b91c1c';
          ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
          // Bow icon
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI);
          ctx.stroke();
        } else if (struct.type === 'cannon_battery') {
          // Cannon barrel pointing toward enemy
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
          // Catapult arm
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(-6, -size * 0.4, 12, size * 0.8);
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.arc(0, -size * 0.35, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (struct.type === 'fire_tower') {
          // Flame nozzle
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

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 9, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body & Armor
      ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Face / Helmet
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -3, 6, 0, Math.PI * 2);
      ctx.fill();

      // Weapon representation
      ctx.save();
      ctx.rotate(sol.facing);
      if (sol.type === 'samurai') {
        // Katana
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
      } else if (sol.type === 'archer') {
        // Bow
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, 0, 7, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (sol.type === 'sapper') {
        // Siege Hammer
        ctx.fillStyle = '#78716c';
        ctx.fillRect(10, -5, 8, 10);
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();
      } else if (sol.type === 'cavalry') {
        // Cavalry Spear (Yari)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();
      }
      ctx.restore();

      // Stance Badge Badge (攻 / 守 / 遊)
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

      // HP bar
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
      // Calculate arc offset for realistic flight curve
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

        // Arrow head
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
        // Smoke trail behind cannonball
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

    // 5. Draw Particles
    for (const part of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Draw Damage Float Numbers
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

    // 7. Draw Build Hover Placement Preview
    if (phase === 'build' && selectedItem && hoverPos) {
      const valid = isValidBuildPos(hoverPos.x, hoverPos.y) && playerBudget >= selectedItem.cost;
      ctx.save();
      ctx.translate(hoverPos.x, hoverPos.y);

      // Placement ghost circle
      ctx.strokeStyle = valid ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
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
    selectedItem,
    selectedStance,
    playerBudget,
    hoverPos,
    isValidBuildPos,
    selectedSoldierId,
    gameTime,
  ]);

  // Handle Mouse Events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_WIDTH / rect.width;
    const scaleY = FIELD_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setHoverPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD_WIDTH / rect.width;
    const scaleY = FIELD_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // First check if user clicked on one of their own soldiers to change stance
    const clickedSoldier = soldiers.find(
      s => s.team === 'player' && s.hp > 0 && Math.hypot(s.x - x, s.y - y) <= 22
    );

    if (clickedSoldier) {
      onSelectSoldier(clickedSoldier.id);
      return;
    }

    onCanvasClick(x, y);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        className="w-full h-auto cursor-crosshair block select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
};
