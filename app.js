/**
 * OriginOS 7 — Origin Workbench Simulator Controller
 *
 * - Single shared 3D perspective vanishing point for both Left-Rail and Top-Bar layouts
 * - Non-spring C2 smooth interruptible & parallel window transitions
 * - 2-Block Context Menu with real backdrop-filter blur and source spring morph directly from ••• dots
 * - Clean OriginOS 7 App Replacement Sheet
 */

(function () {
  'use strict';

  const { GEOMETRY, WindowPhysicsActor, computeTargetPose, projectCardCorner2D } = window.WorkbenchPhysics;
  const { APP_CATALOG, getAppById } = window.WorkbenchApps;

  const phoneStage = document.getElementById('phone-stage');
  const workbenchLayer = document.getElementById('workbench-layer');
  const slotHitZones = Array.from(document.querySelectorAll('.slot-hit-zone'));
  const menuPopover = document.getElementById('wb-menu-popover');
  const ctxBlockTop = document.getElementById('ctx-block-top');
  const ctxBlockBottom = document.getElementById('ctx-block-bottom');
  const popoverBackdrop = document.getElementById('wb-popover-backdrop');
  const fullscreenExitBtn = document.getElementById('fullscreen-exit-btn');

  let currentLayout = 'rail'; // 'rail' | 'top' | 'fullscreen'
  let lastWorkbenchLayout = 'rail';
  let interactionCounter = 10;
  let rafId = null;
  let lastFrameTime = performance.now();
  let morphTimer = null;

  const windows = [];

  function updateViewportScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(1, vh / GEOMETRY.STAGE_H, vw / GEOMETRY.STAGE_W);
    document.documentElement.style.setProperty('--stage-scale', scale.toFixed(4));
  }
  window.addEventListener('resize', updateViewportScale);
  updateViewportScale();

  /**
   * Aligns Context Menu horizontally and vertically with the active window's ••• 3 dots
   */
  function alignCtxMenuToDots() {
    const activeRec = windows.find((w) => w.actor.role === 'active');
    const s = activeRec ? activeRec.actor.state : (GEOMETRY[currentLayout] || GEOMETRY.rail).active;
    const menuWidth = 284;
    const cardTop = s.y - (s.cardH * s.scale) * 0.5;
    const dotsCenterY = cardTop + 18 * s.scale;
    const menuTop = dotsCenterY + 22;
    const menuLeft = s.x - menuWidth * 0.5;

    menuPopover.style.left = `${menuLeft.toFixed(1)}px`;
    menuPopover.style.top = `${menuTop.toFixed(1)}px`;
  }

  /**
   * Context Menu Deforming Morph Animation (exact spring constants from DissolveNotification source)
   * - Starts shrunk right inside the ••• 3 dots: { y: -22, scaleX: 0.06, scaleY: 0.035, opacity: 0 }
   * - Applied directly to .ctx-block-top & .ctx-block-bottom (which share the exact pivot at 50%, 0px
   *   via transform-origin: 50% 0% and 50% -60px) so inner UI deforms with its frosted backdrop-filter
   *   while avoiding any transformed/opacity parent that would break Chromium backdrop blur.
   */
  const CTX_CLOSED = { y: -22, scaleX: 0.06, scaleY: 0.035, opacity: 0 };
  const CTX_OPEN = { y: 0, scaleX: 1, scaleY: 1, opacity: 1 };

  const ctxAnim = {
    isOpen: false,
    raf: null,
    lastTime: 0,
    state: Object.assign({}, CTX_CLOSED),
    vel: { y: 0, scaleX: 0, scaleY: 0 },
    target: Object.assign({}, CTX_CLOSED)
  };

  function stepSpringMass(pos, vel, target, stiffness, damping, mass, dt) {
    const force = -stiffness * (pos - target) - damping * vel;
    const acc = force / mass;
    const nextVel = vel + acc * dt;
    const nextPos = pos + nextVel * dt;
    return [nextPos, nextVel];
  }

  function renderCtxMenu(isSettledOpen) {
    const s = ctxAnim.state;
    const sx = Math.max(0.02, s.scaleX).toFixed(4);
    const sy = Math.max(0.02, s.scaleY).toFixed(4);
    const ty = s.y.toFixed(2);
    const op = Math.max(0, Math.min(1, s.opacity));

    const tf = isSettledOpen ? 'none' : `translate3d(0px, ${ty}px, 0px) scaleX(${sx}) scaleY(${sy})`;
    const opStr = isSettledOpen ? '1' : op.toFixed(3);

    ctxBlockTop.style.transform = tf;
    ctxBlockBottom.style.transform = tf;
    ctxBlockTop.style.opacity = opStr;
    ctxBlockBottom.style.opacity = opStr;

    const interactive = ctxAnim.isOpen ? 'auto' : 'none';
    ctxBlockTop.style.pointerEvents = interactive;
    ctxBlockBottom.style.pointerEvents = interactive;
  }

  function tickCtxMenu(now) {
    const dt = Math.min(0.04, Math.max(0.001, (now - ctxAnim.lastTime) / 1000)) * 0.88;
    ctxAnim.lastTime = now;

    const STEP = 0.002;
    let rem = dt;
    while (rem > 0.00001) {
      const h = Math.min(rem, STEP);
      rem -= h;
      const s = ctxAnim.state;
      const v = ctxAnim.vel;
      const t = ctxAnim.target;

      if (ctxAnim.isOpen) {
        // Exact opening spring parameters from source
        [s.y, v.y] = stepSpringMass(s.y, v.y, t.y, 210, 21, 0.8, h);
        [s.scaleX, v.scaleX] = stepSpringMass(s.scaleX, v.scaleX, t.scaleX, 230, 19, 0.75, h);
        [s.scaleY, v.scaleY] = stepSpringMass(s.scaleY, v.scaleY, t.scaleY, 200, 20, 0.8, h);
        s.opacity += (t.opacity - s.opacity) * (1 - Math.exp(-20 * h));
      } else {
        // Reverse morph back into the ••• 3 dots
        [s.y, v.y] = stepSpringMass(s.y, v.y, t.y, 260, 25, 0.75, h);
        [s.scaleX, v.scaleX] = stepSpringMass(s.scaleX, v.scaleX, t.scaleX, 270, 26, 0.72, h);
        [s.scaleY, v.scaleY] = stepSpringMass(s.scaleY, v.scaleY, t.scaleY, 250, 25, 0.75, h);
        s.opacity += (t.opacity - s.opacity) * (1 - Math.exp(-22 * h));
      }
    }

    const s = ctxAnim.state;
    const v = ctxAnim.vel;
    const t = ctxAnim.target;
    const settled =
      Math.abs(s.y - t.y) < 0.12 &&
      Math.abs(s.scaleX - t.scaleX) < 0.0025 &&
      Math.abs(s.scaleY - t.scaleY) < 0.0025 &&
      Math.abs(s.opacity - t.opacity) < 0.008 &&
      Math.abs(v.y) < 0.4 &&
      Math.abs(v.scaleX) < 0.008 &&
      Math.abs(v.scaleY) < 0.008;

    if (!settled) {
      renderCtxMenu(false);
      ctxAnim.raf = requestAnimationFrame(tickCtxMenu);
    } else {
      Object.assign(ctxAnim.state, ctxAnim.target);
      ctxAnim.vel.y = 0;
      ctxAnim.vel.scaleX = 0;
      ctxAnim.vel.scaleY = 0;
      renderCtxMenu(ctxAnim.isOpen);
      ctxAnim.raf = null;
    }
  }

  function openCtxMenu() {
    alignCtxMenuToDots();

    ctxAnim.isOpen = true;
    ctxAnim.target = Object.assign({}, CTX_OPEN);
    menuPopover.setAttribute('aria-hidden', 'false');
    popoverBackdrop.hidden = false;

    if (!ctxAnim.raf) {
      ctxAnim.lastTime = performance.now();
      ctxAnim.raf = requestAnimationFrame(tickCtxMenu);
    }
  }

  function closeCtxMenu() {
    if (!ctxAnim.isOpen && !ctxAnim.raf) return;
    ctxAnim.isOpen = false;
    ctxAnim.target = Object.assign({}, CTX_CLOSED);
    menuPopover.setAttribute('aria-hidden', 'true');
    popoverBackdrop.hidden = true;

    if (!ctxAnim.raf) {
      ctxAnim.lastTime = performance.now();
      ctxAnim.raf = requestAnimationFrame(tickCtxMenu);
    }
  }

  function toggleMenuPopover() {
    if (ctxAnim.isOpen) {
      closeCtxMenu();
    } else {
      openCtxMenu();
    }
  }

  function syncSlotHitZones() {
    const g = GEOMETRY[currentLayout] || GEOMETRY.rail;
    const isRail = currentLayout === 'rail';
    const hitW = isRail ? 64 : 88;
    const hitH = isRail ? 174 : 108;

    slotHitZones.forEach((btn, idx) => {
      if (currentLayout === 'fullscreen') {
        btn.style.display = 'none';
        return;
      }
      btn.style.display = 'block';
      const pt = g.slots[idx] || g.slots[0];
      btn.style.width = hitW + 'px';
      btn.style.height = hitH + 'px';
      btn.style.left = (pt.x - hitW / 2) + 'px';
      btn.style.top = (pt.y - hitH / 2) + 'px';
    });
  }

  function createWindowRecord(winId, appId, role, slotIndex) {
    const appDef = getAppById(appId);
    const initialTarget = computeTargetPose(currentLayout, role, slotIndex);
    const actor = new WindowPhysicsActor(winId, initialTarget, role, slotIndex);

    const posEl = document.createElement('div');
    posEl.className = 'wb-window-pos';
    posEl.dataset.winId = winId;
    posEl.dataset.role = role;

    posEl.innerHTML = `
      <div class="wb-window-card" data-theme="${appDef.theme}">
        <div class="wb-top-grabber" data-role="grabber">
          <button type="button" class="wb-dots-btn" data-role="dots-btn" aria-label="Window options">
            <svg class="wb-dots-svg" viewBox="0 0 36 12" shape-rendering="geometricPrecision" fill="currentColor" aria-hidden="true">
              <circle cx="6" cy="6" r="2.7" />
              <circle cx="18" cy="6" r="2.7" />
              <circle cx="30" cy="6" r="2.7" />
            </svg>
          </button>
        </div>
        <div class="wb-thumb-hit-shield" data-role="shield"></div>
        <div class="wb-morph-veil" data-role="veil">
          <img src="${appDef.icon}" alt="" class="wb-morph-veil-icon" data-role="veil-icon" draggable="false" />
        </div>
        <div class="wb-app-mount" data-role="app-mount" style="width:100%;height:100%"></div>
      </div>

      <div class="wb-window-badge" data-role="badge" title="${appDef.name}">
        <img src="${appDef.icon}" alt="${appDef.name}" data-role="badge-img" draggable="false" />
      </div>
    `;

    workbenchLayer.appendChild(posEl);

    const cardEl = posEl.querySelector('.wb-window-card');
    const contentEl = posEl.querySelector('[data-role="app-mount"]');
    const badgeEl = posEl.querySelector('[data-role="badge"]');
    const badgeImg = posEl.querySelector('[data-role="badge-img"]');
    const veilEl = posEl.querySelector('[data-role="veil"]');
    const veilIcon = posEl.querySelector('[data-role="veil-icon"]');
    const grabberEl = posEl.querySelector('[data-role="grabber"]');
    const dotsBtn = posEl.querySelector('[data-role="dots-btn"]');
    const shieldEl = posEl.querySelector('[data-role="shield"]');

    contentEl.innerHTML = appDef.render();

    const record = {
      id: winId,
      appId: appDef.id,
      actor,
      dom: {
        posEl,
        cardEl,
        contentEl,
        badgeEl,
        badgeImg,
        veilEl,
        veilIcon,
        grabberEl,
        dotsBtn,
        shieldEl
      }
    };

    const onThumbTrigger = (e) => {
      if (record.actor.role !== 'active') {
        e.stopPropagation();
        e.preventDefault();
        activateWindow(record.id);
      }
    };

    shieldEl.addEventListener('pointerdown', onThumbTrigger);
    badgeEl.addEventListener('pointerdown', onThumbTrigger);
    cardEl.addEventListener('pointerdown', (e) => {
      if (record.actor.role !== 'active') {
        onThumbTrigger(e);
      }
    });

    dotsBtn.addEventListener('click', (e) => {
      if (record.actor.role !== 'active') return;
      e.stopPropagation();
      toggleMenuPopover();
    });

    return record;
  }

  function mountAppIntoRecord(record, newAppId) {
    const appDef = getAppById(newAppId);
    record.appId = appDef.id;
    record.dom.cardEl.dataset.theme = appDef.theme;
    record.dom.badgeImg.src = appDef.icon;
    record.dom.badgeImg.alt = appDef.name;
    record.dom.badgeEl.title = appDef.name;
    record.dom.veilIcon.src = appDef.icon;
    record.dom.contentEl.innerHTML = appDef.render();
  }

  function activateWindow(targetWinId) {
    const targetRec = windows.find((w) => w.id === targetWinId);
    if (!targetRec) return;

    if (morphTimer) {
      clearTimeout(morphTimer);
      windows.forEach((w) => w.dom.cardEl.classList.remove('is-morphing'));
      morphTimer = null;
    }

    if (ctxAnim.isOpen) {
      closeOverlays();
    }

    if (currentLayout === 'fullscreen') {
      currentLayout = lastWorkbenchLayout;
      phoneStage.dataset.layout = currentLayout;
      fullscreenExitBtn.hidden = true;
      syncSlotHitZones();
    }

    const prevActiveRec = windows.find((w) => w.actor.role === 'active');

    if (targetRec === prevActiveRec) {
      targetRec.actor.setTarget(computeTargetPose(currentLayout, 'active', null), 'expand');
      ensureAnimationLoop();
      return;
    }

    const vacatedSlot = targetRec.actor.slot !== null ? targetRec.actor.slot : 0;

    if (prevActiveRec) {
      prevActiveRec.actor.role = 'thumb';
      prevActiveRec.actor.slot = vacatedSlot;
      prevActiveRec.dom.posEl.dataset.role = 'thumb';
      interactionCounter += 1;
      prevActiveRec.actor.zOrder = 100 + interactionCounter;

      const shrinkPose = computeTargetPose(currentLayout, 'thumb', vacatedSlot);
      prevActiveRec.actor.setTarget(shrinkPose, 'shrink');
    }

    targetRec.actor.role = 'active';
    targetRec.actor.slot = null;
    targetRec.dom.posEl.dataset.role = 'active';
    interactionCounter += 1;
    targetRec.actor.zOrder = 100 + interactionCounter;

    const expandPose = computeTargetPose(currentLayout, 'active', null);
    targetRec.actor.setTarget(expandPose, 'expand');

    ensureAnimationLoop();
  }

  function activateSlot(slotIndex) {
    const targetRec = windows.find((w) => w.actor.role === 'thumb' && w.actor.slot === slotIndex);
    if (targetRec) {
      activateWindow(targetRec.id);
    }
  }

  function toggleWorkbenchLayout() {
    closeOverlays();
    const nextLayout = currentLayout === 'rail' ? 'top' : 'rail';
    currentLayout = nextLayout;
    lastWorkbenchLayout = nextLayout;
    phoneStage.dataset.layout = currentLayout;
    fullscreenExitBtn.hidden = true;
    syncSlotHitZones();

    // Smooth UI blur and centered app icon during layout morph
    const activeRec = windows.find((w) => w.actor.role === 'active');
    if (activeRec) {
      activeRec.dom.cardEl.classList.add('is-morphing');
      if (morphTimer) clearTimeout(morphTimer);
      morphTimer = setTimeout(() => {
        windows.forEach((w) => w.dom.cardEl.classList.remove('is-morphing'));
        morphTimer = null;
      }, 340);
    }

    windows.forEach((w) => {
      const mode = w.actor.role === 'active' ? 'expand' : 'shrink';
      const pose = computeTargetPose(currentLayout, w.actor.role, w.actor.slot);
      w.actor.setTarget(pose, mode);
    });

    ensureAnimationLoop();
  }

  function enterFullscreenMode() {
    closeOverlays();
    if (morphTimer) {
      clearTimeout(morphTimer);
      windows.forEach((w) => w.dom.cardEl.classList.remove('is-morphing'));
      morphTimer = null;
    }
    if (currentLayout !== 'fullscreen') {
      lastWorkbenchLayout = currentLayout;
    }
    currentLayout = 'fullscreen';
    phoneStage.dataset.layout = 'fullscreen';
    fullscreenExitBtn.hidden = false;
    syncSlotHitZones();

    windows.forEach((w) => {
      const mode = w.actor.role === 'active' ? 'expand' : 'shrink';
      const pose = computeTargetPose('fullscreen', w.actor.role, w.actor.slot);
      w.actor.setTarget(pose, mode);
    });
    ensureAnimationLoop();
  }

  function exitFullscreenMode() {
    if (morphTimer) {
      clearTimeout(morphTimer);
      windows.forEach((w) => w.dom.cardEl.classList.remove('is-morphing'));
      morphTimer = null;
    }
    currentLayout = lastWorkbenchLayout || 'rail';
    phoneStage.dataset.layout = currentLayout;
    fullscreenExitBtn.hidden = true;
    syncSlotHitZones();

    windows.forEach((w) => {
      const mode = w.actor.role === 'active' ? 'expand' : 'shrink';
      const pose = computeTargetPose(currentLayout, w.actor.role, w.actor.slot);
      w.actor.setTarget(pose, mode);
    });
    ensureAnimationLoop();
  }

  function closeActiveWindow() {
    closeOverlays();
    const activeRec = windows.find((w) => w.actor.role === 'active');
    const slot0Rec = windows.find((w) => w.actor.role === 'thumb' && w.actor.slot === 0);
    if (!activeRec || !slot0Rec) return;

    const usedApps = new Set(windows.map((w) => w.appId));
    const standbyApp = APP_CATALOG.find((a) => !usedApps.has(a.id)) || getAppById(activeRec.appId);

    slot0Rec.actor.role = 'active';
    slot0Rec.actor.slot = null;
    slot0Rec.dom.posEl.dataset.role = 'active';
    interactionCounter += 1;
    slot0Rec.actor.zOrder = 100 + interactionCounter;
    slot0Rec.actor.setTarget(computeTargetPose(currentLayout, 'active', null), 'expand');

    windows.forEach((w) => {
      if (w !== activeRec && w !== slot0Rec && w.actor.role === 'thumb') {
        w.actor.slot = Math.max(0, w.actor.slot - 1);
        w.actor.setTarget(computeTargetPose(currentLayout, 'thumb', w.actor.slot), 'shrink');
      }
    });

    mountAppIntoRecord(activeRec, standbyApp.id);
    activeRec.actor.role = 'thumb';
    activeRec.actor.slot = 3;
    activeRec.dom.posEl.dataset.role = 'thumb';
    activeRec.actor.zOrder = 15;

    const slot3Pose = computeTargetPose(currentLayout, 'thumb', 3);
    activeRec.actor.state.x = currentLayout === 'rail' ? -60 : 440;
    activeRec.actor.state.y = slot3Pose.y + 30;
    activeRec.actor.state.scale = 0.14;
    Object.assign(activeRec.actor.lead2, activeRec.actor.state);
    Object.assign(activeRec.actor.lead1, activeRec.actor.state);
    activeRec.actor.setTarget(slot3Pose, 'shrink');

    ensureAnimationLoop();
  }

  function closeOverlays() {
    if (ctxAnim.isOpen) {
      closeCtxMenu();
    }
    popoverBackdrop.hidden = true;
  }

  popoverBackdrop.addEventListener('pointerdown', closeOverlays);

  menuPopover.addEventListener('click', (e) => {
    const item = e.target.closest('.wb-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    if (action === 'fullscreen') {
      enterFullscreenMode();
    } else if (action === 'toggle-layout') {
      toggleWorkbenchLayout();
    } else if (action === 'replace-app') {
      closeOverlays();
    } else if (action === 'close-app') {
      closeActiveWindow();
    }
  });

  fullscreenExitBtn.addEventListener('click', exitFullscreenMode);

  slotHitZones.forEach((zone) => {
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const slotIdx = parseInt(zone.dataset.slot, 10);
      activateSlot(slotIdx);
    });
  });

  function renderWindowActor(record) {
    const { actor, dom } = record;
    const s = actor.state;
    const sc = Math.max(0.05, s.scale);
    const c = record._cache || (record._cache = {});

    if (c.z !== actor.zOrder) {
      dom.posEl.style.zIndex = String(actor.zOrder);
      c.z = actor.zOrder;
    }

    // High performance: Only trigger browser layout reflow if dimensions changed significantly
    if (c.w === undefined || Math.abs(c.w - s.cardW) > 0.25) {
      dom.cardEl.style.width = `${s.cardW.toFixed(1)}px`;
      dom.cardEl.style.left = `${(-s.cardW * 0.5).toFixed(1)}px`;
      c.w = s.cardW;
    }

    if (c.h === undefined || Math.abs(c.h - s.cardH) > 0.25) {
      dom.cardEl.style.height = `${s.cardH.toFixed(1)}px`;
      dom.cardEl.style.top = `${(-s.cardH * 0.5).toFixed(1)}px`;
      c.h = s.cardH;
    }

    if (c.rad === undefined || Math.abs(c.rad - s.radius) > 0.25) {
      dom.cardEl.style.borderRadius = `${s.radius.toFixed(1)}px`;
      c.rad = s.radius;
    }

    const cardTf =
      `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0px) ` +
      `scale3d(${sc.toFixed(4)}, ${sc.toFixed(4)}, ${sc.toFixed(4)}) ` +
      `rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) rotateZ(${s.rz.toFixed(2)}deg)`;
    dom.cardEl.style.transform = cardTf;
    dom.cardEl.style.webkitTransform = cardTf;

    const hw = (s.cardW * 0.5) * sc;
    const hh = (s.cardH * 0.5) * sc;

    const bl2D = projectCardCorner2D(s.x, s.y, -hw, hh, s.rx, s.ry);
    const tl2D = projectCardCorner2D(s.x, s.y, -hw, -hh, s.rx, s.ry);

    const mix = Math.max(0, Math.min(1, s.badgeTopMix));
    const bx = (bl2D.x + 16) * (1 - mix) + (tl2D.x + 15) * mix;
    const by = (bl2D.y - 16) * (1 - mix) + (tl2D.y + 15) * mix;

    const badgeAlpha = Math.max(0, Math.min(1, s.badgeOpacity));
    const badgeVisible = badgeAlpha > 0.01;
    if (c.bVis !== badgeVisible) {
      dom.badgeEl.style.display = badgeVisible ? 'block' : 'none';
      c.bVis = badgeVisible;
    }

    if (badgeVisible) {
      dom.badgeEl.style.opacity = badgeAlpha.toFixed(3);
      const bInteractive = badgeAlpha > 0.25;
      if (c.bPe !== bInteractive) {
        dom.badgeEl.style.pointerEvents = bInteractive ? 'auto' : 'none';
        c.bPe = bInteractive;
      }
      const badgeTf = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0px) scale(${Math.max(0.1, s.badgeScale).toFixed(3)})`;
      dom.badgeEl.style.transform = badgeTf;
      dom.badgeEl.style.webkitTransform = badgeTf;
    }

    const chromeAlpha = Math.max(0, Math.min(1, s.chromeOpacity));
    const chromeVisible = chromeAlpha > 0.01;
    if (c.cVis !== chromeVisible) {
      dom.grabberEl.style.display = chromeVisible ? 'flex' : 'none';
      c.cVis = chromeVisible;
    }

    if (chromeVisible) {
      dom.grabberEl.style.opacity = chromeAlpha.toFixed(3);
      const cInteractive = chromeAlpha > 0.4;
      if (c.cPe !== cInteractive) {
        dom.grabberEl.style.pointerEvents = cInteractive ? 'auto' : 'none';
        c.cPe = cInteractive;
      }
    }
  }

  function tick(now) {
    const dt = Math.max(0.001, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    let anyMoving = false;
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const moving = w.actor.step(dt);
      if (moving) anyMoving = true;
      renderWindowActor(w);
    }

    if (anyMoving) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function ensureAnimationLoop() {
    if (rafId === null) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === '1') activateSlot(0);
    else if (e.key === '2') activateSlot(1);
    else if (e.key === '3') activateSlot(2);
    else if (e.key === '4') activateSlot(3);
    else if (e.key === 'l' || e.key === 'L') toggleWorkbenchLayout();
    else if (e.key === 'Escape') {
      closeOverlays();
      if (currentLayout === 'fullscreen') exitFullscreenMode();
    }
  });

  function initWorkbench() {
    renderCtxMenu(false);
    syncSlotHitZones();

    const initialSetup = [
      { id: 'win-settings', appId: 'settings', role: 'active', slot: null },
      { id: 'win-music', appId: 'music', role: 'thumb', slot: 0 },
      { id: 'win-gallery', appId: 'gallery', role: 'thumb', slot: 1 },
      { id: 'win-notes', appId: 'notes', role: 'thumb', slot: 2 },
      { id: 'win-weather', appId: 'weather', role: 'thumb', slot: 3 }
    ];

    initialSetup.forEach((cfg) => {
      const rec = createWindowRecord(cfg.id, cfg.appId, cfg.role, cfg.slot);
      windows.push(rec);
      renderWindowActor(rec);
    });
  }

  initWorkbench();
})();
