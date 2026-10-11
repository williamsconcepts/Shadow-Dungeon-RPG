// Virtual Joystick Controller for Touch & Mouse input
// Responsive 360-degree analog control

class VirtualJoystick {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.maxRadius = options.maxRadius || 50;
    this.deadzone = options.deadzone || 0.12;

    // Output vector
    this.vector = { x: 0, y: 0, magnitude: 0, angle: 0, active: false };

    // Internal state
    this.touchId = null;
    this.origin = { x: 0, y: 0 };
    this.current = { x: 0, y: 0 };
    this.isMouseDown = false;

    // DOM Elements
    this.baseEl = null;
    this.knobEl = null;

    this.createElements();
    this.bindEvents();
  }

  createElements() {
    this.baseEl = document.createElement('div');
    this.baseEl.className = 'v-joystick-base';

    this.knobEl = document.createElement('div');
    this.knobEl.className = 'v-joystick-knob';

    this.baseEl.appendChild(this.knobEl);
    this.container.appendChild(this.baseEl);
  }

  bindEvents() {
    // Touch events on the container or base
    this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    window.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    // Mouse fallback for testing or mouse drag on desktop
    this.baseEl.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  handleTouchStart(e) {
    if (this.vector.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const rect = this.container.getBoundingClientRect();
      // Only process touches on the left control area
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        e.preventDefault();
        this.touchId = touch.identifier;
        this.vector.active = true;

        const baseRect = this.baseEl.getBoundingClientRect();
        this.origin = {
          x: baseRect.left + baseRect.width / 2,
          y: baseRect.top + baseRect.height / 2
        };
        this.updatePosition(touch.clientX, touch.clientY);
        this.baseEl.classList.add('active');
        break;
      }
    }
  }

  handleTouchMove(e) {
    if (!this.vector.active) return;
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
    if (!this.vector.active) return;
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
    this.isMouseDown = true;
    this.vector.active = true;
    const baseRect = this.baseEl.getBoundingClientRect();
    this.origin = {
      x: baseRect.left + baseRect.width / 2,
      y: baseRect.top + baseRect.height / 2
    };
    this.updatePosition(e.clientX, e.clientY);
    this.baseEl.classList.add('active');
  }

  handleMouseMove(e) {
    if (!this.isMouseDown) return;
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
      this.knobEl.style.transform = `translate(0px, 0px)`;
      return;
    }

    const effectiveMagnitude = (normalizedDist - this.deadzone) / (1 - this.deadzone);
    this.vector.magnitude = effectiveMagnitude;
    this.vector.angle = angle;
    this.vector.x = Math.cos(angle) * effectiveMagnitude;
    this.vector.y = Math.sin(angle) * effectiveMagnitude;

    // Visual knob offset
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    this.knobEl.style.transform = `translate(${knobX}px, ${knobY}px)`;
  }

  reset() {
    this.touchId = null;
    this.vector.active = false;
    this.vector.x = 0;
    this.vector.y = 0;
    this.vector.magnitude = 0;
    this.vector.angle = 0;
    if (this.baseEl) {
      this.baseEl.classList.remove('active');
    }
    if (this.knobEl) {
      this.knobEl.style.transform = `translate(0px, 0px)`;
    }
  }
}

window.VirtualJoystick = VirtualJoystick;
