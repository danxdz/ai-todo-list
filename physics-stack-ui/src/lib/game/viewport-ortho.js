/**
 * Shared viewport + canvas sizing for merge demos (OrthographicCamera or PerspectiveCamera).
 */

/**
 * @param {object} opts
 * @param {import('three').WebGLRenderer} opts.renderer
 * @param {import('three').Camera} opts.camera
 * @param {HTMLCanvasElement} opts.canvasEl
 */
export function createOrthoViewportLayout({ renderer, camera, canvasEl }) {
  const state = {
    layoutWorldHalfW: 3.5,
    layoutWorldViewH: 12,
    orthoBaseHalfW: 3.5,
    orthoBaseHalfSpanY: 6,
    orthoMidY: 5,
    /** Vertical FOV (deg) for PerspectiveCamera — tuned from cup half-height */
    perspectiveFov: 60,
  };

  function hudReservePx() {
    const inGameShell = !!canvasEl.closest?.('.game-shell');
    if (!document.body.classList.contains('merge-game') && !inGameShell) return 0;
    const shell = canvasEl.closest?.('.game-shell');
    const bottomStrip = shell?.querySelector?.('.bottom-strip');
    let measuredReserve = 0;
    if (bottomStrip) {
      const rect = bottomStrip.getBoundingClientRect();
      if (rect.height > 0) {
        // Reserve exactly the HUD footprint at bottom (height + bottom gap + small breathing room).
        const bottomGap = Math.max(0, window.innerHeight - rect.bottom);
        measuredReserve = Math.max(0, Math.ceil(rect.height + bottomGap + 34));
      }
    }
    if (measuredReserve > 0) {
      return Math.min(220, Math.max(66, measuredReserve));
    }
    return 0;
  }

  function getViewportSize() {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    /** Fullscreen + several desktop browsers report bad visualViewport offsets/heights → canvas shifts down and clips */
    if (document.fullscreenElement) {
      const hr = hudReservePx();
      return { width: iw, height: Math.max(1, ih - hr), offsetLeft: 0, offsetTop: 0 };
    }
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      let w = vv.width;
      let h = vv.height;
      let ox = vv.offsetLeft;
      let oy = vv.offsetTop;
      const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
      const vvLooksBroken =
        !coarse &&
        (Math.abs(oy) > ih * 0.2 ||
          Math.abs(ox) > iw * 0.2 ||
          h < ih * 0.75 ||
          w < iw * 0.75);
      if (vvLooksBroken) {
        w = iw;
        h = ih;
        ox = 0;
        oy = 0;
      }
      const hr = hudReservePx();
      return { width: w, height: Math.max(1, h - hr), offsetLeft: ox, offsetTop: oy };
    }
    const hr = hudReservePx();
    return { width: iw, height: Math.max(1, ih - hr), offsetLeft: 0, offsetTop: 0 };
  }

  function updateCameraFrustum() {
    const halfW = state.orthoBaseHalfW;
    const spanY = state.orthoBaseHalfSpanY;
    const w = Math.max(1, renderer.domElement.width);
    const h = Math.max(1, renderer.domElement.height);
    if (camera.isPerspectiveCamera) {
      const aspect = w / h;
      let fov = state.perspectiveFov;
      if (aspect < 0.72) fov += Math.min(7, (0.72 - aspect) * 16);
      if (aspect > 1.55) fov -= Math.min(4, (aspect - 1.55) * 4);
      camera.aspect = aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      return;
    }
    const va = w / h;
    const ca = halfW / spanY;
    let aw;
    let ahHalf;
    if (va > ca) {
      ahHalf = spanY;
      aw = ahHalf * va;
    } else {
      aw = halfW;
      ahHalf = aw / va;
    }
    camera.left = -aw;
    camera.right = aw;
    camera.bottom = -ahHalf;
    camera.top = ahHalf;
    camera.updateProjectionMatrix();
  }

  function syncCanvasToViewport() {
    const { width: vpW, height: vpH, offsetLeft, offsetTop } = getViewportSize();
    const w = Math.max(1, Math.floor(vpW));
    const h = Math.max(1, Math.floor(vpH));
    renderer.setSize(w, h, false);
    canvasEl.style.position = 'fixed';
    canvasEl.style.left = `${offsetLeft}px`;
    canvasEl.style.top = `${offsetTop}px`;
    canvasEl.style.width = `${w}px`;
    canvasEl.style.height = `${h}px`;
    updateCameraFrustum();
    return { width: w, height: h };
  }

  /** Vertical half-extent of ortho frustum in world Y (matches syncCanvasToViewport). */
  function getOrthoAhHalf() {
    if (camera.isPerspectiveCamera) {
      return state.orthoBaseHalfSpanY;
    }
    const w = Math.max(1, renderer.domElement.width);
    const h = Math.max(1, renderer.domElement.height);
    const va = w / h;
    const ca = state.orthoBaseHalfW / state.orthoBaseHalfSpanY;
    if (va > ca) return state.orthoBaseHalfSpanY;
    return state.orthoBaseHalfW / va;
  }

  function canvasCenterClient() {
    const r = canvasEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /**
   * Called from fitCameraToCup: updates ortho content frame + tracking fields.
   * @param {{ halfW: number, halfSpanY: number, midY: number }} p
   */
  function applyCupOrthoFrame({ halfW, halfSpanY, midY }) {
    state.layoutWorldHalfW = halfW;
    state.layoutWorldViewH = halfSpanY * 2;
    state.orthoBaseHalfW = halfW;
    state.orthoBaseHalfSpanY = halfSpanY;
    state.orthoMidY = midY;
    /** Match ~distance from camera to cup center in applyMergeOrthoCameraPose (~18.5) */
    const camDist = 18.5;
    const fovRad = 2 * Math.atan((halfSpanY * 1.12) / camDist);
    state.perspectiveFov = Math.min(50, Math.max(32, (fovRad * 180) / Math.PI));
  }

  return {
    state,
    getViewportSize,
    updateCameraFrustum,
    syncCanvasToViewport,
    getOrthoAhHalf,
    canvasCenterClient,
    applyCupOrthoFrame,
  };
}
