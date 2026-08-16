import Phaser from 'phaser';
import type { MenuController, MenuResult } from './MenuController.ts';

export interface MenuKeyHandlers {
  readonly onResult: (result: MenuResult) => void;
  readonly onMoved?: () => void;
  readonly onCycled?: () => void;
  /** When true (default), Space acts like Enter. */
  readonly spaceActivates?: boolean;
}

/**
 * Wires the shared console pad onto a scene's keyboard plugin.
 *
 * Arrow hold repeats so a long planet list or a car roster can be flicked
 * through; Enter / Esc / Space fire once per press.
 */
export function bindMenuKeys(
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  menu: MenuController,
  handlers: MenuKeyHandlers,
): void {
  const dispatch = (result: MenuResult): void => {
    if (result.type !== 'none') {
      handlers.onResult(result);
    }
  };

  const add = (code: number, repeat: boolean, fn: () => void): void => {
    keyboard.addKey(code, true, repeat).on('down', fn);
  };

  add(Phaser.Input.Keyboard.KeyCodes.UP, true, () => {
    dispatch(menu.move(-1));
    handlers.onMoved?.();
  });
  add(Phaser.Input.Keyboard.KeyCodes.DOWN, true, () => {
    dispatch(menu.move(1));
    handlers.onMoved?.();
  });
  add(Phaser.Input.Keyboard.KeyCodes.LEFT, true, () => {
    if (menu.cycle(-1)) {
      handlers.onCycled?.();
    }
  });
  add(Phaser.Input.Keyboard.KeyCodes.RIGHT, true, () => {
    if (menu.cycle(1)) {
      handlers.onCycled?.();
    }
  });
  add(Phaser.Input.Keyboard.KeyCodes.ENTER, false, () => {
    dispatch(menu.confirm());
  });
  if (handlers.spaceActivates !== false) {
    add(Phaser.Input.Keyboard.KeyCodes.SPACE, false, () => {
      dispatch(menu.confirm());
    });
  }
  add(Phaser.Input.Keyboard.KeyCodes.ESC, false, () => {
    dispatch(menu.cancel());
  });
}
