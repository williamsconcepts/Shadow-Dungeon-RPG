// Gamepad & Xbox Controller Manager
// Full support for Xbox Series X/S, Xbox One, Xbox 360, and Standard Gamepads

class GamepadManager {
  constructor(game) {
    this.game = game;
    this.connected = false;
    this.gamepadIndex = null;
    this.gamepadId = '';
    this.isXbox = false;

    // Analog stick states
    this.leftStick = { x: 0, y: 0, active: false };
    this.rightStick = { x: 0, y: 0, active: false };
    this.deadzone = 0.18;

    // Button states (current and previous frame for edge detection)
    this.buttons = {};
    this.prevButtons = {};

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.onConnected(e.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.onDisconnected(e.gamepad);
    });
  }

  onConnected(gp) {
    this.connected = true;
    this.gamepadIndex = gp.index;
    this.gamepadId = gp.id;
    this.isXbox = /xbox|x-box|microsoft|045e/i.test(gp.id) || true; // Default to Xbox layout

    console.log(`🎮 Gamepad connected at index ${gp.index}: ${gp.id}`);
    
    // Trigger toast notification and UI update
    this.showGamepadToast(`🎮 ${this.getControllerName()} Connected!`);
    document.body.classList.add('gamepad-active');

    // Start audio context if suspended
    if (window.soundEngine && !window.soundEngine.isInitialized) {
      window.soundEngine.init();
    }
  }

  onDisconnected(gp) {
    if (this.gamepadIndex === gp.index) {
      this.connected = false;
      this.gamepadIndex = null;
      console.log(`🎮 Gamepad disconnected: ${gp.id}`);
      this.showGamepadToast('🎮 Controller Disconnected');
      document.body.classList.remove('gamepad-active');
    }
  }

  getControllerName() {
    if (/xbox/i.test(this.gamepadId)) return 'Xbox Controller';
    if (/playstation|dualshock|dualsense/i.test(this.gamepadId)) return 'PlayStation Controller';
    return 'Xbox / Gamepad Controller';
  }

  showGamepadToast(message) {
    let toast = document.getElementById('gamepad-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gamepad-toast';
      toast.className = 'gamepad-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Poll gamepad state every frame
  poll() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;

    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      gp = gamepads[this.gamepadIndex];
    } else {
      // Find first connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          if (!this.connected) {
            this.onConnected(gp);
          }
          break;
        }
      }
    }

    if (!gp) {
      if (this.connected) {
        this.connected = false;
        document.body.classList.remove('gamepad-active');
      }
      return;
    }

    // Save previous buttons for justPressed detection
    this.prevButtons = { ...this.buttons };

    // Standard Mapping:
    // 0: A
    // 1: B
    // 2: X
    // 3: Y
    // 4: LB
    // 5: RB
    // 6: LT (trigger)
    // 7: RT (trigger)
    // 8: Back / View
    // 9: Start / Menu
    // 10: L3 (left stick click)
    // 11: R3 (right stick click)
    // 12: D-pad Up
    // 13: D-pad Down
    // 14: D-pad Left
    // 15: D-pad Right
    this.buttons = {
      A: gp.buttons[0]?.pressed || false,
      B: gp.buttons[1]?.pressed || false,
      X: gp.buttons[2]?.pressed || false,
      Y: gp.buttons[3]?.pressed || false,
      LB: gp.buttons[4]?.pressed || false,
      RB: gp.buttons[5]?.pressed || false,
      LT: (gp.buttons[6]?.pressed || gp.buttons[6]?.value > 0.4) || false,
      RT: (gp.buttons[7]?.pressed || gp.buttons[7]?.value > 0.4) || false,
      View: gp.buttons[8]?.pressed || false,
      Menu: gp.buttons[9]?.pressed || false,
      L3: gp.buttons[10]?.pressed || false,
      R3: gp.buttons[11]?.pressed || false,
      DpadUp: gp.buttons[12]?.pressed || false,
      DpadDown: gp.buttons[13]?.pressed || false,
      DpadLeft: gp.buttons[14]?.pressed || false,
      DpadRight: gp.buttons[15]?.pressed || false,
    };

    // Analog Sticks
    const rawLx = gp.axes[0] || 0;
    const rawLy = gp.axes[1] || 0;
    const rawRx = gp.axes[2] || 0;
    const rawRy = gp.axes[3] || 0;

    this.leftStick = this.applyDeadzone(rawLx, rawLy);
    this.rightStick = this.applyDeadzone(rawRx, rawRy);

    // D-pad movement override if stick is inactive
    if (!this.leftStick.active) {
      let dx = 0;
      let dy = 0;
      if (this.buttons.DpadUp) dy -= 1;
      if (this.buttons.DpadDown) dy += 1;
      if (this.buttons.DpadLeft) dx -= 1;
      if (this.buttons.DpadRight) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        this.leftStick = {
          x: dx / len,
          y: dy / len,
          active: true,
          angle: Math.atan2(dy, dx),
          magnitude: 1
        };
      }
    }
  }

  applyDeadzone(x, y) {
    const mag = Math.hypot(x, y);
    if (mag < this.deadzone) {
      return { x: 0, y: 0, active: false, angle: 0, magnitude: 0 };
    }
    const normMag = Math.min(1, (mag - this.deadzone) / (1 - this.deadzone));
    const angle = Math.atan2(y, x);
    return {
      x: Math.cos(angle) * normMag,
      y: Math.sin(angle) * normMag,
      active: true,
      angle: angle,
      magnitude: normMag
    };
  }

  isDown(btnName) {
    return !!this.buttons[btnName];
  }

  isJustPressed(btnName) {
    return !!this.buttons[btnName] && !this.prevButtons[btnName];
  }

  isJustReleased(btnName) {
    return !this.buttons[btnName] && !!this.prevButtons[btnName];
  }

  // Haptic Dual-Rumble Vibration Feedback
  vibrate(duration = 200, weakMagnitude = 0.4, strongMagnitude = 0.4) {
    if (!this.connected || this.gamepadIndex === null) return;
    const settings = window.StorageManager ? window.StorageManager.getSettings() : { vibration: true };
    if (settings.vibration === false) return;
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[this.gamepadIndex];
      if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: duration,
          weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1, Math.max(0, strongMagnitude))
        }).catch(() => {});
      }
    } catch (e) {
      // Haptics unsupported or disabled
    }
  }
}

window.GamepadManager = GamepadManager;
