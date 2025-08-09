import { Format, TransformableInfo } from "logform";
import { logsTotal, logsSampled } from "../metrics/index.js";

interface SamplingOptions {
  sampleRate: number; // 0.0 to 1.0
  levels?: string[]; // levels to sample, if not specified - all levels
  highVolumePatterns?: string[]; // patterns that should be sampled more aggressively
  criticalPatterns?: string[]; // patterns that should never be sampled
}

export class SamplingFormat implements Format {
  private sampleRate: number;
  private levels: Set<string> | null;
  private highVolumePatterns: RegExp[];
  private criticalPatterns: RegExp[];

  constructor(options: SamplingOptions) {
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate));
    this.levels = options.levels ? new Set(options.levels) : null;
    this.highVolumePatterns = (options.highVolumePatterns || []).map(
      (pattern) => new RegExp(pattern, "i"),
    );
    this.criticalPatterns = (options.criticalPatterns || []).map(
      (pattern) => new RegExp(pattern, "i"),
    );
  }

  transform(info: TransformableInfo): TransformableInfo | false {
    const service = (info.service as string) || "unknown";
    const level = info.level;
    const message = (info.message as string) || "";

    // Рахуємо всі логи
    logsTotal.inc({ level, service });

    // Ніколи не семплюємо критичні повідомлення
    if (this.criticalPatterns.some((pattern) => pattern.test(message))) {
      return info;
    }

    // Завжди логуємо помилки і попередження незалежно від семплінгу
    if (level === "error" || level === "warn") {
      return info;
    }

    // Перевіряємо чи потрібно семплювати цей рівень
    if (this.levels && !this.levels.has(level)) {
      return info;
    }

    // Агресивніший семплінг для високонавантажених паттернів
    let effectiveSampleRate = this.sampleRate;
    if (this.highVolumePatterns.some((pattern) => pattern.test(message))) {
      effectiveSampleRate = Math.min(this.sampleRate, 0.01); // 1% для високонавантажених логів
    }

    // Застосовуємо семплінг
    if (Math.random() > effectiveSampleRate) {
      logsSampled.inc({ level, service });
      return false; // Пропускаємо цей лог
    }

    return info;
  }
}
