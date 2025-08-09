import { Format, TransformableInfo } from "logform";

interface SamplingOptions {
  sampleRate: number; // 0.0 to 1.0
  levels?: string[]; // levels to sample, if not specified - all levels
}

export class SamplingFormat implements Format {
  private sampleRate: number;
  private levels: Set<string> | null;

  constructor(options: SamplingOptions) {
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate));
    this.levels = options.levels ? new Set(options.levels) : null;
  }

  transform(info: TransformableInfo): TransformableInfo | false {
    // Always log errors and warnings regardless of sampling
    if (info.level === "error" || info.level === "warn") {
      return info;
    }

    // Check if we should sample this level
    if (this.levels && !this.levels.has(info.level)) {
      return info;
    }

    // Apply sampling
    if (Math.random() > this.sampleRate) {
      return false; // Skip this log entry
    }

    return info;
  }
}
