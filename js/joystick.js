// Virtual Joystick Controller for Mobile Touch & Desktop Mouse Drag
// 360-degree analog control with dynamic floating & fixed touch support

class VirtualJoystick {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.maxRadius = options.maxRadius || 48;
    this.deadzone = options.deadzone || 0.08;
    this.allowLeftScreenTouch = options.allowLeftScreenTouch !== false;

    // Output vector
    this.vector = { x: 0, y: 0, magnitude: 0, angle: 0, active: false };

    // Direct property mirrors for maximum compatibility
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.magnitude = 0;

    // Internal state
    this.touchId = null;
    this.origin = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.isFloating = false;

    // DOM Elements
    this.baseEl = null;
    this.knobEl = null;

    this.createElements();
    this.bindEvents();
  }

  // Getters for vector fields
  get getVector() { return this.vector; }

  createElements() {
    this.baseEl = document.createElement('div');
    this.baseEl.className = 'v-joystick-base';

    this.knobEl = document.createElement('div');
    this.knobEl.className = 'v-joystick-knob';

    this.baseEl.appendChild(this.knobEl);
    this.container.appendChild(this.baseEl);
  }

  bindEvents() {
    // 1. Direct container touch events
    this.container.addEventListener('touchstart', (e) => this.handleContainerTouchStart(e), { passive: false });
    
    // 2. Global window touch events for tracking & left-half screen floating joystick
    window.addEventListener('touchstart', (e) => this.handleGlobalTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    window.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    // 3. Mouse events for desktop drag testing
    this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.baseEl.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  unlockAudio() {
    if (window.soundEngine && !window.soundEngine.isInitialized) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }
  }

  handleContainerTouchStart(e) {
    if (this.active) return;
    this.unlockAudio();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      e.preventDefault();
      this.startTracking(touch.identifier, touch.clientX, touch.clientY, false);
      break;
    }
  }

  handleGlobalTouchStart(e) {
    if (this.active) return;

    // Only activate if game is actively playing and mobile controls are visible
    const mobileControls = document.getElementById('mobile-controls');
    if (!mobileControls || mobileControls.classList.contains('hidden')) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Ignore touches on UI buttons, hotbar, modals, or headers
      const target = touch.target;
      if (target && (target.closest('button') || target.closest('.modal-backdrop') || target.closest('.hud-top-left') || target.closest('.hud-top-right'))) {
        continue;
      }

      // Check if touch is on the left movement side of the screen (left 46% of width, below top 70px)
      const isLeftScreen = touch.clientX <= window.innerWidth * 0.46 && touch.clientY >= 70;
      if (isLeftScreen) {
        e.preventDefault();
        this.unlockAudio();

        // Reposition base dynamically under player's thumb
        const contRect = this.container.getBoundingClientRect();
        const isInsideContainer = (
          touch.clientX >= contRect.left && touch.clientX <= contRect.right &&
          touch.clientY >= contRect.top && touch.clientY <= contRect.bottom
        );

        this.startTracking(touch.identifier, touch.clientX, touch.clientY, !isInsideContainer);
        break;
      }
    }
  }

  startTracking(touchId, clientX, clientY, isFloating) {
    this.touchId = touchId;
    this.active = true;
    this.vector.active = true;
    this.isFloating = isFloating;

    if (isFloating) {
      // Position base directly at the touch point
      this.baseEl.style.position = 'fixed';
      this.baseEl.style.left = `${clientX}px`;
      this.baseEl.style.top = `${clientY}px`;
      this.baseEl.style.transform = 'translate(-50%, -50%)';
      this.origin = { x: clientX, y: clientY };
    } else {
      // Anchored to resting container
      this.baseEl.style.position = '';
      this.baseEl.style.left = '';
      this.baseEl.style.top = '';
      this.baseEl.style.transform = '';
      const baseRect = this.baseEl.getBoundingClientRect();
      this.origin = {
        x: baseRect.left + baseRect.width / 2,
        y: baseRect.top + baseRect.height / 2
      };
    }

    this.baseEl.classList.add('active');
    this.updatePosition(clientX, clientY);

    if (navigator.vibrate) {
      try { navigator.vibrate(6); } catch (err) {}
    }
  }

  handleTouchMove(e) {
    if (!this.active || this.touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        e.preventDefault();
        this.updatePosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  handleTouchEnd(e) {
    if (!this.active || this.touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.reset();
        break;
      }
    }
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;
    this.unlockAudio();
    this.isMouseDown = true;
    this.active = true;
    this.vector.active = true;
    this.isFloating = false;

    const baseRect = this.baseEl.getBoundingClientRect();
    this.origin = {
      x: baseRect.left + baseRect.width / 2,
      y: baseRect.top + baseRect.height / 2
    };

    this.baseEl.classList.add('active');
    this.updatePosition(e.clientX, e.clientY);
  }

  handleMouseMove(e) {
    if (!this.isMouseDown || !this.active) return;
    this.updatePosition(e.clientX, e.clientY);
  }

  handleMouseUp(e) {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.reset();
    }
  }

  updatePosition(clientX, clientY) {
    const dx = clientX - this.origin.x;
    const dy = clientY - this.origin.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(distance, this.maxRadius);
    const normalizedDist = clampedDist / this.maxRadius;

    if (normalizedDist < this.deadzone) {
      this.vector.x = 0;
      this.vector.y = 0;
      this.vector.magnitude = 0;
      this.x = 0;
      this.y = 0;
      this.magnitude = 0;
      this.knobEl.style.transform = 'translate(0px, 0px)';
      return;
    }

    const effectiveMagnitude = (normalizedDist - this.deadzone) / (1 - this.deadzone);
    this.vector.magnitude = effectiveMagnitude;
    this.vector.angle = angle;
    this.vector.x = Math.cos(angle) * effectiveMagnitude;
    this.vector.y = Math.sin(angle) * effectiveMagnitude;

    // Direct property mirrors
    this.magnitude = effectiveMagnitude;
    this.angle = angle;
    this.x = this.vector.x;
    this.y = this.vector.y;

    // Knob visual offset
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    this.knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;
  }

  reset() {
    this.touchId = null;
    this.isMouseDown = false;
    this.active = false;
    this.vector.active = false;
    this.vector.x = 0;
    this.vector.y = 0;
    this.vector.magnitude = 0;
    this.vector.angle = 0;

    this.x = 0;
    this.y = 0;
    this.magnitude = 0;
    this.angle = 0;

    if (this.baseEl) {
      this.baseEl.classList.remove('active');
      if (this.isFloating) {
        this.baseEl.style.position = '';
        this.baseEl.style.left = '';
        this.baseEl.style.top = '';
        this.baseEl.style.transform = '';
        this.isFloating = false;
      }
    }

    if (this.knobEl) {
      this.knobEl.style.transform = 'translate(0px, 0px)';
    }
  }
}

window.VirtualJoystick = VirtualJoystick;
