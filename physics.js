/**
 * OriginOS 7 — Non-Spring Smooth Interruptible & Parallel Animation Engine
 *
 * Uses a dt-independent 3-stage cascaded exponential smoother (lead1 -> lead2 -> pos):
 * - Strictly ZERO spring bounce / ZERO overshoot
 * - C2 smooth continuity (continuous position, velocity, AND acceleration on rapid mid-flight interruption)
 * - Staggered phase rates across axes for graceful curved flight trajectories
 * - Single shared 3D perspective camera (215, 470, P=520) so all 4 miniature windows
 *   in both Left-Rail and Top-Bar layouts converge cleanly toward one vanishing point.
 */

(function (global) {
  'use strict';

  const STEP_SEC = 0.002;
  const MAX_DT_SEC = 0.048;
  const ANIM_SPEED = 0.84; // Slightly gentler, unhurried curve while staying snappy
  const EPS_POS = 0.06;
  const EPS_SCALE = 0.0004;
  const EPS_ANGLE = 0.03;

  const GEOMETRY = {
    STAGE_W: 430,
    STAGE_H: 932,
    CARD_W: 336,
    CARD_H: 790,
    PERSP: 520,
    ORIGIN_X: 215,
    ORIGIN_Y: 470,

    // 1. 3D Left-Rail Workbench Layout ("Bố cục 3D cạnh bên" — Single Vanishing Point)
    rail: {
      active: {
        x: 248,
        y: 478,
        scale: 1.0,
        rx: 0,
        ry: 0,
        rz: 0,
        cardW: 336,
        cardH: 790,
        radius: 32,
        chromeOpacity: 1,
        badgeOpacity: 0,
        badgeScale: 0.5,
        badgeTopMix: 0
      },
      // x: 60 gives ~25px clean left margin from screen edge (zero clipping on cards or badges!)
      slots: [
        { x: 60, y: 185 },
        { x: 60, y: 375 },
        { x: 60, y: 565 },
        { x: 60, y: 755 }
      ],
      thumbScale: 0.218,
      thumbCardW: 336,
      thumbCardH: 790,
      thumbRadius: 46,
      thumbAngles: { rx: 0, ry: 48, rz: 0 }
    },

    // 2. 3D Top-Bar Horizontal Workbench Layout ("Bố cục ngang phía trên" — Single Vanishing Point)
    // In Top layout, active card widens to cardW: 394 so its left/right edges exactly span the 4 thumbnails above!
    top: {
      active: {
        x: 215,
        y: 560,
        scale: 1.0,
        rx: 0,
        ry: 0,
        rz: 0,
        cardW: 394,
        cardH: 700,
        radius: 32,
        chromeOpacity: 1,
        badgeOpacity: 0,
        badgeScale: 0.5,
        badgeTopMix: 1
      },
      slots: [
        { x: 61.7, y: 106 },
        { x: 163.9, y: 106 },
        { x: 266.1, y: 106 },
        { x: 368.3, y: 106 }
      ],
      thumbScale: 0.260,
      thumbCardW: 336,
      thumbCardH: 410,
      thumbRadius: 44,
      thumbAngles: { rx: -22, ry: 0, rz: 0 }
    },

    // 3. Fullscreen Expanded Mode ("Chuyển sang toàn màn hình")
    fullscreen: {
      active: {
        x: 215,
        y: 466,
        scale: 1.28,
        rx: 0,
        ry: 0,
        rz: 0,
        cardW: 336,
        cardH: 730,
        radius: 0,
        chromeOpacity: 0,
        badgeOpacity: 0,
        badgeScale: 0.3,
        badgeTopMix: 0
      },
      slots: [
        { x: -90, y: 185 },
        { x: -90, y: 375 },
        { x: -90, y: 565 },
        { x: -90, y: 755 }
      ],
      thumbScale: 0.18,
      thumbCardW: 336,
      thumbCardH: 790,
      thumbRadius: 46,
      thumbAngles: { rx: 0, ry: 48, rz: 0 }
    }
  };

  /**
   * 3-Stage Non-Spring Smooth Profiles [r1, r2, r3]
   * Staggered rates create natural curved flight & 3D banking without spring bounce.
   */
  const SMOOTH_RATES = {
    expand: {
      x: [60, 38, 21],
      y: [48, 32, 18],
      scale: [50, 34, 19],
      rx: [58, 38, 21],
      ry: [58, 38, 21],
      rz: [54, 36, 20],
      cardW: [52, 34, 19],
      cardH: [52, 34, 19],
      radius: [52, 34, 19],
      chrome: [64, 42, 24],
      badge: [72, 46, 26]
    },
    shrink: {
      x: [48, 32, 18],
      y: [52, 34, 19],
      scale: [60, 38, 21],
      rx: [42, 28, 16],
      ry: [42, 28, 16],
      rz: [46, 30, 17],
      cardW: [50, 33, 18.5],
      cardH: [50, 33, 18.5],
      radius: [50, 33, 18.5],
      chrome: [72, 46, 26],
      badge: [46, 30, 17]
    }
  };

  function stepCascaded3D(pos, l2, l1, target, r1, r2, r3, dt) {
    const a1 = 1 - Math.exp(-r1 * dt);
    const a2 = 1 - Math.exp(-r2 * dt);
    const a3 = 1 - Math.exp(-r3 * dt);
    const nl1 = l1 + (target - l1) * a1;
    const nl2 = l2 + (nl1 - l2) * a2;
    const npos = pos + (nl2 - pos) * a3;
    return [npos, nl2, nl1];
  }

  class WindowPhysicsActor {
    constructor(id, initialTarget, initialRole, initialSlot) {
      this.id = id;
      this.role = initialRole;
      this.slot = initialSlot;
      this.mode = initialRole === 'active' ? 'expand' : 'shrink';
      this.zOrder = initialRole === 'active' ? 100 : 20 - (initialSlot || 0);

      this.state = Object.assign({}, initialTarget);
      this.lead2 = Object.assign({}, initialTarget);
      this.lead1 = Object.assign({}, initialTarget);
      this.target = Object.assign({}, initialTarget);
    }

    setTarget(newTarget, mode) {
      Object.assign(this.target, newTarget);
      if (mode) this.mode = mode;
    }

    step(dt) {
      const profile = SMOOTH_RATES[this.mode] || SMOOTH_RATES.expand;
      let remaining = Math.min(dt, MAX_DT_SEC) * ANIM_SPEED;

      while (remaining > 0.00001) {
        const h = Math.min(remaining, STEP_SEC);
        remaining -= h;

        const s = this.state;
        const l2 = this.lead2;
        const l1 = this.lead1;
        const t = this.target;

        [s.x, l2.x, l1.x] = stepCascaded3D(s.x, l2.x, l1.x, t.x, profile.x[0], profile.x[1], profile.x[2], h);
        [s.y, l2.y, l1.y] = stepCascaded3D(s.y, l2.y, l1.y, t.y, profile.y[0], profile.y[1], profile.y[2], h);
        [s.scale, l2.scale, l1.scale] = stepCascaded3D(
          s.scale,
          l2.scale,
          l1.scale,
          t.scale,
          profile.scale[0],
          profile.scale[1],
          profile.scale[2],
          h
        );
        [s.rx, l2.rx, l1.rx] = stepCascaded3D(s.rx, l2.rx, l1.rx, t.rx, profile.rx[0], profile.rx[1], profile.rx[2], h);
        [s.ry, l2.ry, l1.ry] = stepCascaded3D(s.ry, l2.ry, l1.ry, t.ry, profile.ry[0], profile.ry[1], profile.ry[2], h);
        [s.rz, l2.rz, l1.rz] = stepCascaded3D(s.rz, l2.rz, l1.rz, t.rz, profile.rz[0], profile.rz[1], profile.rz[2], h);
        [s.cardW, l2.cardW, l1.cardW] = stepCascaded3D(
          s.cardW,
          l2.cardW,
          l1.cardW,
          t.cardW,
          profile.cardW[0],
          profile.cardW[1],
          profile.cardW[2],
          h
        );
        [s.cardH, l2.cardH, l1.cardH] = stepCascaded3D(
          s.cardH,
          l2.cardH,
          l1.cardH,
          t.cardH,
          profile.cardH[0],
          profile.cardH[1],
          profile.cardH[2],
          h
        );
        [s.radius, l2.radius, l1.radius] = stepCascaded3D(
          s.radius,
          l2.radius,
          l1.radius,
          t.radius,
          profile.radius[0],
          profile.radius[1],
          profile.radius[2],
          h
        );
        [s.chromeOpacity, l2.chromeOpacity, l1.chromeOpacity] = stepCascaded3D(
          s.chromeOpacity,
          l2.chromeOpacity,
          l1.chromeOpacity,
          t.chromeOpacity,
          profile.chrome[0],
          profile.chrome[1],
          profile.chrome[2],
          h
        );
        [s.badgeOpacity, l2.badgeOpacity, l1.badgeOpacity] = stepCascaded3D(
          s.badgeOpacity,
          l2.badgeOpacity,
          l1.badgeOpacity,
          t.badgeOpacity,
          profile.badge[0],
          profile.badge[1],
          profile.badge[2],
          h
        );
        [s.badgeScale, l2.badgeScale, l1.badgeScale] = stepCascaded3D(
          s.badgeScale,
          l2.badgeScale,
          l1.badgeScale,
          t.badgeScale,
          profile.badge[0],
          profile.badge[1],
          profile.badge[2],
          h
        );
        [s.badgeTopMix, l2.badgeTopMix, l1.badgeTopMix] = stepCascaded3D(
          s.badgeTopMix,
          l2.badgeTopMix,
          l1.badgeTopMix,
          t.badgeTopMix,
          profile.badge[0],
          profile.badge[1],
          profile.badge[2],
          h
        );
      }

      return !this.isSettled();
    }

    isSettled() {
      const s = this.state;
      const l2 = this.lead2;
      const t = this.target;

      const done =
        Math.abs(s.x - t.x) < EPS_POS &&
        Math.abs(s.y - t.y) < EPS_POS &&
        Math.abs(l2.x - t.x) < EPS_POS &&
        Math.abs(l2.y - t.y) < EPS_POS &&
        Math.abs(s.cardW - t.cardW) < 0.2 &&
        Math.abs(s.cardH - t.cardH) < 0.2 &&
        Math.abs(s.scale - t.scale) < EPS_SCALE &&
        Math.abs(s.rx - t.rx) < EPS_ANGLE &&
        Math.abs(s.ry - t.ry) < EPS_ANGLE &&
        Math.abs(s.rz - t.rz) < EPS_ANGLE &&
        Math.abs(s.badgeOpacity - t.badgeOpacity) < 0.004 &&
        Math.abs(s.chromeOpacity - t.chromeOpacity) < 0.004 &&
        Math.abs(s.badgeTopMix - t.badgeTopMix) < 0.004;

      if (done) {
        Object.assign(this.state, this.target);
        Object.assign(this.lead2, this.target);
        Object.assign(this.lead1, this.target);
        return true;
      }
      return false;
    }
  }

  function computeTargetPose(layout, role, slotIndex) {
    const g = GEOMETRY[layout] || GEOMETRY.rail;
    if (role === 'active') {
      return Object.assign({}, g.active);
    }

    const slotPos = g.slots[slotIndex] || g.slots[0];
    const angles = g.thumbAngles || { rx: 0, ry: 48, rz: 0 };

    return {
      x: slotPos.x,
      y: slotPos.y,
      scale: g.thumbScale,
      rx: angles.rx,
      ry: angles.ry,
      rz: angles.rz,
      cardW: g.thumbCardW || 336,
      cardH: g.thumbCardH,
      radius: g.thumbRadius,
      chromeOpacity: 0,
      badgeOpacity: layout === 'fullscreen' ? 0 : 1,
      badgeScale: layout === 'fullscreen' ? 0.3 : 1,
      badgeTopMix: layout === 'top' ? 1 : 0
    };
  }

  function projectCardCorner2D(cxCard, cyCard, lx, ly, rxDeg, ryDeg) {
    const rx = (rxDeg * Math.PI) / 180;
    const ry = (ryDeg * Math.PI) / 180;

    const x1 = lx * Math.cos(ry);
    const z1 = -lx * Math.sin(ry);
    const y1 = ly;

    const x2 = x1;
    const y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);

    const wx = cxCard + x2;
    const wy = cyCard + y2;
    const wz = z2;

    const p = GEOMETRY.PERSP;
    const ox = GEOMETRY.ORIGIN_X;
    const oy = GEOMETRY.ORIGIN_Y;
    const perspScale = p / Math.max(80, p - wz);

    return {
      x: ox + (wx - ox) * perspScale,
      y: oy + (wy - oy) * perspScale
    };
  }

  global.WorkbenchPhysics = {
    GEOMETRY,
    WindowPhysicsActor,
    computeTargetPose,
    projectCardCorner2D
  };
})(window);
