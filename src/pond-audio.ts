import clips from "../public/audio/manifest.json";

export type SoundState = {
  enabled: boolean;
  phase: "armed" | "loading" | "on" | "error";
};
type Clip = keyof typeof clips;

/** One lazily unlocked audio graph for the entire visit, never per route. */
export class PondAudio {
  private state: SoundState = { enabled: true, phase: "armed" };
  private listeners = new Set<() => void>();
  private context?: AudioContext;
  private master?: GainNode;
  private waterGain?: GainNode;
  private buffers?: Record<Clip, AudioBuffer>;
  private loading?: Promise<void>;
  private activating?: Promise<void>;
  private background?: AudioBufferSourceNode;
  private water?: AudioBufferSourceNode;
  private drop?: AudioBufferSourceNode;
  private lastPulse = -Infinity;
  private lastDrop = -Infinity;
  private pond = true;
  private visible = true;
  private disposed = false;
  private abort = new AbortController();
  private videos = new Map<
    HTMLVideoElement,
    { muted: boolean; changed: () => void }
  >();

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(state: SoundState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  // Attempt on mount, then retry directly in pointer/key gestures if autoplay
  // is restricted. Resume precedes every await so gesture activation is retained.
  activate = () => {
    if (!this.state.enabled || !this.visible || this.disposed) return;
    if (this.activating) {
      // Autoplay may leave resume pending, or a hidden tab may suspend it
      // while downloads are pending. Unlock the same context in this gesture.
      void this.context?.resume().catch(() => {});
      return;
    }
    if (this.state.phase === "on" && this.context?.state === "running") return;
    try {
      if (!this.context) {
        const Context =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Context) throw Error("Web Audio unavailable");
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
        this.waterGain = this.context.createGain();
        this.waterGain.gain.value = 0;
        this.waterGain.connect(this.master);
      }
      const context = this.context;
      const resume = context.resume();
      this.publish({ enabled: true, phase: "loading" });
      this.loading ??= this.load(context).catch((error) => {
        this.loading = undefined;
        throw error;
      });
      this.activating = Promise.all([resume, this.loading])
        .then(() => {
          if (!this.state.enabled || !this.visible || this.disposed) return;
          if (context.state !== "running") {
            this.publish({ enabled: true, phase: "armed" });
            return;
          }
          if (!this.background) {
            const gain = context.createGain();
            gain.gain.value = 0.55;
            gain.connect(this.master!);
            this.background = this.voice("background", gain, true);
          }
          this.ramp(this.master!.gain, 0.7, 0.3);
          this.publish({ enabled: true, phase: "on" });
          this.updateVideos();
        })
        .catch((error) => {
          if (this.disposed || !this.state.enabled) return;
          this.publish({
            enabled: true,
            phase: error?.name === "NotAllowedError" ? "armed" : "error",
          });
          this.updateVideos();
          if (context.state !== "closed")
            void context.suspend().catch(() => {});
        })
        .finally(() => {
          this.activating = undefined;
        });
    } catch {
      this.publish({ enabled: true, phase: "error" });
    }
  };
  private async load(context: AudioContext) {
    const decoded = await Promise.all(
      (Object.keys(clips) as Clip[]).map(async (key) => {
        const response = await fetch(clips[key].src, {
          signal: this.abort.signal,
          cache: "force-cache",
        });
        if (!response.ok) throw Error("Audio unavailable");
        return [
          key,
          await context.decodeAudioData(await response.arrayBuffer()),
        ] as const;
      }),
    );
    this.buffers = Object.fromEntries(decoded) as Record<Clip, AudioBuffer>;
  }
  private voice(clip: Clip, destination: GainNode, loop = false) {
    const source = this.context!.createBufferSource();
    source.buffer = this.buffers![clip];
    source.loop = loop;
    source.connect(destination);
    source.addEventListener("ended", () => source.disconnect(), { once: true });
    source.start();
    return source;
  }
  private ramp(gain: AudioParam, target: number, seconds: number) {
    const now = this.context!.currentTime;
    // cancelAndHold preserves a fade already in progress instead of jumping.
    if (typeof gain.cancelAndHoldAtTime === "function")
      gain.cancelAndHoldAtTime(now);
    else {
      const current = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(current, now);
    }
    gain.linearRampToValueAtTime(target, now + seconds);
  }
  private audible() {
    return (
      this.state.phase === "on" &&
      this.visible &&
      this.context?.state === "running"
    );
  }
  stir = () => {
    if (!this.pond || !this.audible()) return;
    const now = this.context!.currentTime;
    if (now - this.lastPulse < 0.06) return;
    this.lastPulse = now;
    if (!this.water) {
      const source = this.voice("stir", this.waterGain!, true);
      this.water = source;
      source.addEventListener(
        "ended",
        () => {
          if (this.water === source) this.water = undefined;
        },
        { once: true },
      );
    }
    this.ramp(this.waterGain!.gain, 0.75, 0.07);
    this.waterGain!.gain.setValueAtTime(0.75, now + 0.3);
    this.waterGain!.gain.linearRampToValueAtTime(0, now + 1.1);
    // Replace the still-future stop on the same voice in audio time.
    this.water.stop(now + 1.15);
  };
  private stopWater() {
    this.water?.stop();
    this.water = undefined;
    this.lastPulse = -Infinity;
    if (this.context && this.waterGain) {
      this.waterGain.gain.cancelScheduledValues(this.context.currentTime);
      this.waterGain.gain.setValueAtTime(0, this.context.currentTime);
    }
  }
  select = () => {
    if (!this.audible()) return;
    const now = this.context!.currentTime;
    if (now - this.lastDrop < 0.09) return;
    this.lastDrop = now;
    this.drop?.stop();
    const gain = this.context!.createGain();
    gain.gain.value = 0.75;
    gain.connect(this.master!);
    const source = this.voice("drop", gain);
    this.drop = source;
    source.addEventListener(
      "ended",
      () => {
        gain.disconnect();
        if (this.drop === source) this.drop = undefined;
      },
      { once: true },
    );
  };
  setPondActive(active: boolean) {
    this.pond = active;
    if (!active) this.stopWater();
  }
  setVisible(visible: boolean) {
    const wasVisible = this.visible;
    this.visible = visible;
    this.updateVideos();
    if (visible) {
      if (!wasVisible) this.activate();
      return;
    }
    this.stopWater();
    this.drop?.stop();
    this.drop = undefined;
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.value = 0;
      void this.context.suspend().catch(() => {});
    }
    if (this.state.enabled) this.publish({ enabled: true, phase: "armed" });
  }
  registerVideo(video: HTMLVideoElement) {
    const entry = {
      muted: false,
      changed: () => {
        if (!this.state.enabled || !this.visible) {
          if (!video.muted) video.muted = true;
        } else entry.muted = video.muted;
      },
    };
    this.videos.set(video, entry);
    video.addEventListener("volumechange", entry.changed);
    this.updateVideos();
    return () => {
      video.removeEventListener("volumechange", entry.changed);
      this.videos.delete(video);
    };
  }
  private updateVideos() {
    this.videos.forEach((entry, video) => {
      video.muted = !this.state.enabled || !this.visible || entry.muted;
    });
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.stopWater();
    this.drop?.stop();
    this.background?.stop();
    this.videos.forEach((entry, video) =>
      video.removeEventListener("volumechange", entry.changed),
    );
    this.videos.clear();
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
  }
}
