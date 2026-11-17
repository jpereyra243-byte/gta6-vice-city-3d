// Input manager for keyboard, mouse and UI controls

export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      rightDown: false
    };
    this.isLocked = false;
    this.justPressed = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('contextmenu', this._onContextMenu);
  }

  _onKeyDown(e) {
    const code = e.code;
    if (!this.keys[code]) {
      this.justPressed[code] = true;
    }
    this.keys[code] = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onMouseMove(e) {
    if (document.pointerLockElement) {
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
    }
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this.mouse.down = true;
      this.justPressed['Mouse0'] = true;
    } else if (e.button === 2) {
      this.mouse.rightDown = true;
      this.justPressed['Mouse2'] = true;
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) this.mouse.down = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  _onContextMenu(e) {
    e.preventDefault();
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.justPressed[code];
  }

  resetDelta() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.justPressed = {};
  }

  requestLock(element) {
    if (element && element.requestPointerLock) {
      element.requestPointerLock();
    }
  }
}
