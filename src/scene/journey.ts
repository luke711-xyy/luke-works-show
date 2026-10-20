import { clamp, lerp, smooth } from "./motion";

/** One camera, not two independently translated/pre-positioned pages. */
export class Journey {
  x = 0;
  private from = 0;
  private target = 0;
  private elapsed = 0;
  private duration = 0;
  constructor(
    private width: number,
    private reduced = false,
  ) {}
  get moving() {
    return this.x !== this.target;
  }
  get progress() {
    return Math.min(1, this.x / this.width);
  }
  get scroll() {
    return Math.max(0, this.x - this.width);
  }
  get destinationScroll() {
    return Math.max(0, this.target - this.width);
  }
  go(page: "pond" | "works", scroll: number, immediate = false) {
    const target = page === "works" ? this.width + Math.max(0, scroll) : 0;
    if (immediate || this.reduced) {
      this.x = this.from = this.target = target;
      return;
    }
    if (target === this.target) return;
    this.from = this.x;
    this.target = target;
    this.elapsed = 0;
    this.duration = clamp(
      0.7 + Math.log2(1 + Math.abs(target - this.x) / this.width) * 0.36,
      0.7,
      1.65,
    );
  }
  step(dt: number) {
    if (!this.moving) return;
    this.elapsed += Math.max(0, dt);
    const t = clamp(this.elapsed / this.duration, 0, 1);
    this.x = t === 1 ? this.target : lerp(this.from, this.target, smooth(t));
  }
  setScroll(scroll: number) {
    this.x = this.from = this.target = this.width + Math.max(0, scroll);
  }
  resize(width: number, destinationScroll: number) {
    const moving = this.moving;
    const ratio = width / this.width;
    this.x *= ratio;
    this.target = this.target ? width + Math.max(0, destinationScroll) : 0;
    this.width = width;
    if (!moving) {
      this.x = this.from = this.target;
      return;
    }
    // A breakpoint can change the gallery stride independently of width.
    // Rebase the remaining curve through the current camera position.
    const eased = smooth(clamp(this.elapsed / this.duration, 0, 1));
    this.from = (this.x - this.target * eased) / (1 - eased);
  }
}
