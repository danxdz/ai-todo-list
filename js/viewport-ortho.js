/**
 * Shared orthographic viewport + canvas sizing for merge demos.
 * Keeps visualViewport/fullscreen quirks and letterboxed ortho frustum in one place.
 */

/**
 * @param {object} opts
 * @param {import('three').WebGLRenderer} opts.renderer
 * @param {import('three').OrthographicCamera} opts.camera
 * @param {HTMLCanvasElement} opts.canvasEl
 */
export function createOrthoViewportLayout({ renderer, camera, canvasEl }) {
  const state = {
    layoutWorldHalfW: 3.5,
    layoutWorldViewH: 12,
    orthoBaseHalfW: 3.5,
    orthoBaseHalfSpanY: 6,
    orthoMidY: 5,
  };

  function getViewportSize() {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    /** Fullscreen + several desktop browsers report bad visualViewport offsets/heights → canvas shifts down and clips */
    if (document.fullscreenElement) {
      return { width: iw, height: ih, offsetLeft: 0, offsetTop: 0 };
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
      return { width: w, height: h, offsetLeft: ox, offsetTop: oy };
    }
    return { width: iw, height: ih, offsetLeft: 0, offsetTop: 0 };
  }

  function updateCameraFrustum() {
    const halfW = state.orthoBaseHalfW;
    const spanY = state.orthoBaseHalfSpanY;
    const w = Math.max(1, renderer.domElement.width);
    const h = Math.max(1, renderer.domElement.height);
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
