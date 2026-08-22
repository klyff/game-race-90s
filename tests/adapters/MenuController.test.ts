import { describe, it, expect } from 'vitest';
import { MENU_KIND, MenuController } from '../../src/adapters/input/MenuController.ts';
import type { MenuItemSpec } from '../../src/adapters/input/MenuController.ts';

function actionMenu(): MenuController {
  return new MenuController([
    { id: 'return', kind: MENU_KIND.ACTION, label: 'RETURN' },
    { id: 'save', kind: MENU_KIND.ACTION, label: 'SAVE' },
    { id: 'quit', kind: MENU_KIND.ACTION, label: 'MAIN MENU' },
  ]);
}

function optionMenu(onPreview?: (id: string, valueIndex: number, value: string) => void): MenuController {
  const items: readonly MenuItemSpec[] = [
    {
      id: 'car',
      kind: MENU_KIND.OPTION,
      label: 'CAR',
      values: ['MARAUDER', 'HAVAC', 'AIR-BLADE'],
      valueIndex: 0,
    },
    { id: 'start', kind: MENU_KIND.ACTION, label: 'START' },
  ];
  return new MenuController(items, { onPreview });
}

describe('MenuController', () => {
  it('rejects an empty menu', () => {
    expect(() => new MenuController([])).toThrow(/at least one item/);
  });

  it('wraps up/down around the list', () => {
    const menu = actionMenu();
    expect(menu.selectedId).toBe('return');
    menu.move(-1);
    expect(menu.selectedId).toBe('quit');
    menu.move(1);
    expect(menu.selectedId).toBe('return');
  });

  it('jumps several slots and wraps, and can snap to an index', () => {
    const menu = actionMenu();
    menu.jump(2);
    expect(menu.selectedId).toBe('quit');
    menu.jump(-3);
    expect(menu.selectedId).toBe('quit');
    menu.jump(1);
    expect(menu.selectedId).toBe('return');
    menu.selectIndex(1);
    expect(menu.selectedId).toBe('save');
    expect(menu.jump(0).type).toBe('none');
  });

  it('activates the highlighted action on confirm', () => {
    const menu = actionMenu();
    menu.move(1);
    expect(menu.confirm()).toEqual({ type: 'activate', id: 'save' });
  });

  it('backs out of a clean action list on cancel', () => {
    expect(actionMenu().cancel()).toEqual({ type: 'back' });
  });

  it('left/right do nothing on an action row', () => {
    const menu = actionMenu();
    expect(menu.cycle(1)).toBe(false);
    expect(menu.cycle(-1)).toBe(false);
  });

  it('cycles an option and marks it dirty until Enter saves', () => {
    const previews: string[] = [];
    const menu = optionMenu((_id, _index, value) => {
      previews.push(value);
    });

    expect(menu.cycle(1)).toBe(true);
    expect(menu.isDirty()).toBe(true);
    expect(menu.valueIndex('car')).toBe(1);
    expect(previews).toEqual(['HAVAC']);

    expect(menu.confirm()).toEqual({
      type: 'commit',
      id: 'car',
      valueIndex: 1,
      value: 'HAVAC',
    });
    expect(menu.isDirty()).toBe(false);
    expect(menu.valueIndex('car')).toBe(1);
  });

  it('Esc discards a dirty option and restores the committed value', () => {
    const previews: string[] = [];
    const menu = optionMenu((_id, _index, value) => {
      previews.push(value);
    });

    menu.cycle(1);
    menu.cycle(1);
    expect(menu.valueIndex('car')).toBe(2);

    expect(menu.cancel()).toEqual({
      type: 'discard',
      id: 'car',
      valueIndex: 0,
      value: 'MARAUDER',
    });
    expect(menu.isDirty()).toBe(false);
    expect(menu.valueIndex('car')).toBe(0);
    expect(previews.at(-1)).toBe('MARAUDER');
  });

  it('leaving a dirty option with up/down also discards', () => {
    const menu = optionMenu();
    menu.cycle(1);
    expect(menu.move(1)).toEqual({
      type: 'discard',
      id: 'car',
      valueIndex: 0,
      value: 'MARAUDER',
    });
    expect(menu.selectedId).toBe('start');
    expect(menu.isDirty()).toBe(false);
    expect(menu.valueIndex('car')).toBe(0);
  });

  it('Esc on a clean option backs out instead of no-op', () => {
    const menu = optionMenu();
    expect(menu.cancel()).toEqual({ type: 'back' });
  });

  it('wraps option values', () => {
    const menu = optionMenu();
    menu.cycle(-1);
    expect(menu.valueIndex('car')).toBe(2);
  });

  it('paints action and option rows with a cursor', () => {
    const menu = optionMenu();
    const [car, start] = menu.views();
    expect(car?.text).toBe('> CAR : MARAUDER <');
    expect(car?.selected).toBe(true);
    expect(start?.text).toBe('START');

    menu.move(1);
    const after = menu.views();
    expect(after[1]?.text).toBe('> START <');
  });

  it('setOption can commit a dedicated-key change', () => {
    const menu = optionMenu();
    menu.setOption('car', 2, true);
    expect(menu.valueIndex('car')).toBe(2);
    expect(menu.isDirty()).toBe(false);
    expect(menu.cancel()).toEqual({ type: 'back' });
  });
});
