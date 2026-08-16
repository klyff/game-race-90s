import Phaser from 'phaser';
import { formatTuningOverlay } from './TuningOverlayFormat.ts';
import type { TuningOverlayReadout } from './TuningOverlayFormat.ts';

/**
 * The tuning overlay: a fixed block of monospace text pinned to the corner of the
 * screen, showing what the tyres and the camera are actually doing.
 *
 * Deliberately thin. Every formatting decision — units, precision, wording, the key
 * legend — lives in `TuningOverlayFormat.ts`, which is pure and unit-tested. All this
 * class owns is the Phaser text object and whether it is visible, because those are
 * the only parts that cannot be asserted in Node.
 *
 * It exists because the acceptance test for handling is a human reading numbers while
 * driving. Squinting at a 64 px car cannot tell you whether the tyres saturated at 0.86
 * or at 1.00, and that difference is the whole of "drifts on purpose, not by accident".
 */

/** Screen-space inset of the text block, pixels. Matches the old debug text. */
const MARGIN_PIXELS = 12;

export class TuningOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
    this.text = scene.add
      .text(MARGIN_PIXELS, MARGIN_PIXELS, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0e0',
        // A dim backdrop, not just a text colour. The block sits over whatever the car
        // happens to be driving past, and this pale grey vanished against Thunder Basin's
        // light brown run-off — which is exactly where a driver most wants to read it.
        backgroundColor: 'rgba(8, 10, 14, 0.66)',
        padding: { x: 6, y: 4 },
      })
      // The maximum depth keeps the block above the road, the cars and the tyre marks, all
      // of which use `IsoProjection.depthOf` values that grow with world position.
      .setDepth(Number.MAX_SAFE_INTEGER);
  }

  /** True when the overlay is on screen. */
  get isVisible(): boolean {
    return this.text.visible;
  }

  /** Redraws the block. Cheap enough to call every rendered frame. */
  update(readout: TuningOverlayReadout): void {
    // Skip the formatting work entirely while hidden: this runs every frame, and a
    // hidden overlay that still formats six lines is pure waste in the frame budget.
    if (!this.text.visible) {
      return;
    }
    this.text.setText(formatTuningOverlay(readout).join('\n'));
    this.pinToViewport();
  }

  toggle(): void {
    this.text.setVisible(!this.text.visible);
    if (this.text.visible) {
      this.pinToViewport();
    }
  }

  destroy(): void {
    this.text.destroy();
  }

  /**
   * Parks the block at the top-left of what the camera can actually see, at a constant
   * pixel size.
   *
   * `setScrollFactor(0)` is the obvious way to pin a HUD and it is NOT enough here, because
   * it only cancels the camera's scroll — the zoom still applies. Under T-020's adaptive
   * zoom of 1.5 to 2.0 that pushed the old debug text clean off the viewport, which is why
   * nothing was legible on screen even though the text object reported `visible: true` with
   * the right contents. Verifications read the numbers through `window.game` rather than
   * off the image, so it went unnoticed.
   *
   * Instead the block tracks `camera.worldView` in world space and counter-scales by the
   * zoom, so it lands on the same screen pixels at the same size whatever the camera does.
   */
  private pinToViewport(): void {
    const zoom = this.camera.zoom;
    if (!Number.isFinite(zoom) || zoom <= 0) {
      return;
    }
    const inset = MARGIN_PIXELS / zoom;
    this.text.setScale(1 / zoom);
    this.text.setPosition(this.camera.worldView.x + inset, this.camera.worldView.y + inset);
  }
}
