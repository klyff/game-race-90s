/**
 * Pure console-style menu cursor.
 *
 * Up/down moves the highlight. When the highlight is an option, left/right
 * cycles a draft value. Enter commits that draft (or activates an action).
 * Esc discards a dirty draft; if nothing is dirty it backs out of the screen.
 *
 * No Phaser. Scenes bind keys and paint `views()`.
 */

export const MENU_KIND = {
  ACTION: 'action',
  OPTION: 'option',
} as const;

export type MenuKind = (typeof MENU_KIND)[keyof typeof MENU_KIND];

export interface MenuActionSpec {
  readonly id: string;
  readonly kind: typeof MENU_KIND.ACTION;
  readonly label: string;
}

export interface MenuOptionSpec {
  readonly id: string;
  readonly kind: typeof MENU_KIND.OPTION;
  readonly label: string;
  readonly values: readonly string[];
  readonly valueIndex: number;
}

export type MenuItemSpec = MenuActionSpec | MenuOptionSpec;

export interface MenuItemView {
  readonly id: string;
  readonly kind: MenuKind;
  readonly label: string;
  readonly selected: boolean;
  readonly dirty: boolean;
  readonly value: string | null;
  readonly valueIndex: number | null;
  readonly text: string;
}

export type MenuResult =
  | { readonly type: 'activate'; readonly id: string }
  | {
      readonly type: 'commit';
      readonly id: string;
      readonly valueIndex: number;
      readonly value: string;
    }
  | {
      readonly type: 'discard';
      readonly id: string;
      readonly valueIndex: number;
      readonly value: string;
    }
  | { readonly type: 'back' }
  | { readonly type: 'none' };

export interface MenuControllerOptions {
  readonly selectedIndex?: number;
  readonly onPreview?: (id: string, valueIndex: number, value: string) => void;
}

export const MENU_PROMPT_LIST = '↑↓ MOVE     ENTER SELECT     ESC BACK';
export const MENU_PROMPT_OPTIONS = '↑↓ MOVE     ←→ VALUE     ENTER SAVE     ESC CANCEL';

export class MenuController {
  private readonly items: readonly MenuItemSpec[];
  private readonly committed: number[];
  private readonly draft: number[];
  private readonly dirtyFlags: boolean[];
  private cursor: number;
  private readonly onPreview: MenuControllerOptions['onPreview'];

  constructor(items: readonly MenuItemSpec[], options?: MenuControllerOptions) {
    if (items.length === 0) {
      throw new Error('MenuController needs at least one item');
    }
    this.items = items;
    this.committed = items.map(item =>
      item.kind === MENU_KIND.OPTION ? clampIndex(item.valueIndex, item.values.length) : 0,
    );
    this.draft = [...this.committed];
    this.dirtyFlags = items.map(() => false);
    this.cursor = wrapIndex(options?.selectedIndex ?? 0, items.length);
    this.onPreview = options?.onPreview;
  }

  get selectedIndex(): number {
    return this.cursor;
  }

  get selectedId(): string {
    return this.items[this.cursor]?.id ?? '';
  }

  isDirty(): boolean {
    return this.dirtyFlags.some(flag => flag);
  }

  views(): readonly MenuItemView[] {
    return this.items.map((_, index) => this.viewAt(index));
  }

  /**
   * Move the cursor. A dirty option on the old row is discarded first so a
   * half-edited setting cannot leak onto the next row.
   */
  move(direction: number): MenuResult {
    if (direction === 0) {
      return { type: 'none' };
    }
    const discarded = this.discardCurrentIfDirty();
    this.cursor = wrapIndex(this.cursor + Math.sign(direction), this.items.length);
    return discarded;
  }

  /**
   * Move the cursor by `delta` slots (not just one). Character-select uses
   * this for 2D grid arrows: ±1 across a row, ±columns up/down.
   */
  jump(delta: number): MenuResult {
    if (delta === 0 || !Number.isFinite(delta)) {
      return { type: 'none' };
    }
    const discarded = this.discardCurrentIfDirty();
    this.cursor = wrapIndex(this.cursor + Math.trunc(delta), this.items.length);
    return discarded;
  }

  /** Snap the cursor to an index. Used for pointer hits on a grid. */
  selectIndex(index: number): void {
    this.cursor = wrapIndex(index, this.items.length);
  }

  /** Cycle the highlighted option. Returns false when the row is an action. */
  cycle(direction: number): boolean {
    const item = this.items[this.cursor];
    if (item === undefined || item.kind !== MENU_KIND.OPTION || item.values.length === 0) {
      return false;
    }
    if (direction === 0) {
      return false;
    }
    const next = wrapIndex(this.draft[this.cursor]! + Math.sign(direction), item.values.length);
    this.draft[this.cursor] = next;
    this.dirtyFlags[this.cursor] = next !== this.committed[this.cursor];
    this.onPreview?.(item.id, next, item.values[next]!);
    return true;
  }

  confirm(): MenuResult {
    const item = this.items[this.cursor];
    if (item === undefined) {
      return { type: 'none' };
    }
    if (item.kind === MENU_KIND.ACTION) {
      return { type: 'activate', id: item.id };
    }
    const valueIndex = this.draft[this.cursor]!;
    const value = item.values[valueIndex] ?? '';
    this.committed[this.cursor] = valueIndex;
    this.dirtyFlags[this.cursor] = false;
    return { type: 'commit', id: item.id, valueIndex, value };
  }

  /** Discard a dirty option; if the row is clean, leave the screen. */
  cancel(): MenuResult {
    const discarded = this.discardCurrentIfDirty();
    if (discarded.type !== 'none') {
      return discarded;
    }
    return { type: 'back' };
  }

  /** Draft index for an option (the value currently on screen). */
  valueIndex(id: string): number {
    const index = this.items.findIndex(item => item.id === id);
    if (index < 0) {
      return 0;
    }
    return this.draft[index] ?? 0;
  }

  /**
   * Force an option to a value. Used when a dedicated key (M for mute) must
   * stay in lock-step with the row that shows the same setting.
   */
  setOption(id: string, valueIndex: number, commit = true): void {
    const index = this.items.findIndex(item => item.id === id);
    const item = index >= 0 ? this.items[index] : undefined;
    if (item === undefined || item.kind !== MENU_KIND.OPTION) {
      return;
    }
    const next = clampIndex(valueIndex, item.values.length);
    this.draft[index] = next;
    if (commit) {
      this.committed[index] = next;
      this.dirtyFlags[index] = false;
    } else {
      this.dirtyFlags[index] = next !== this.committed[index];
    }
    this.onPreview?.(item.id, next, item.values[next] ?? '');
  }

  private discardCurrentIfDirty(): MenuResult {
    const item = this.items[this.cursor];
    if (item === undefined || item.kind !== MENU_KIND.OPTION || this.dirtyFlags[this.cursor] !== true) {
      return { type: 'none' };
    }
    const valueIndex = this.committed[this.cursor]!;
    const value = item.values[valueIndex] ?? '';
    this.draft[this.cursor] = valueIndex;
    this.dirtyFlags[this.cursor] = false;
    this.onPreview?.(item.id, valueIndex, value);
    return { type: 'discard', id: item.id, valueIndex, value };
  }

  private viewAt(index: number): MenuItemView {
    const item = this.items[index]!;
    const selected = index === this.cursor;
    if (item.kind === MENU_KIND.ACTION) {
      return {
        id: item.id,
        kind: item.kind,
        label: item.label,
        selected,
        dirty: false,
        value: null,
        valueIndex: null,
        text: selected ? `> ${item.label} <` : item.label,
      };
    }
    const valueIndex = this.draft[index]!;
    const value = item.values[valueIndex] ?? '';
    const inner = `${item.label} : ${value}`;
    return {
      id: item.id,
      kind: item.kind,
      label: item.label,
      selected,
      dirty: this.dirtyFlags[index] === true,
      value,
      valueIndex,
      text: selected ? `> ${inner} <` : inner,
    };
  }
}

function wrapIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return ((index % count) + count) % count;
}

function clampIndex(index: number, count: number): number {
  if (count <= 0 || !Number.isFinite(index)) {
    return 0;
  }
  return Math.max(0, Math.min(count - 1, Math.floor(index)));
}
