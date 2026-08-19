/**
 * 未来レーダー (MiraiRadar) - Cyberpunk Industrial Synthesizer
 * 緊迫感ある緊急警報ビープ ＆ ノイジー・サイバーグリッチ音響エンジン
 * （Web Audio API 0秒レイテンシ・高解像度FM変調 ＆ ノイズバースト）
 */

class CyberSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('mirai_sound_muted') === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mirai_sound_muted', String(this.isMuted));
    }
    if (!this.isMuted) {
      this.playEmergencyBeep();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // 1. ノイズバースト生成（アナログ端末のざらついたグリッチ感）
  private playNoiseBurst(durationSec: number = 0.05, filterFreq: number = 3000, maxGain: number = 0.04) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // ホワイトノイズ
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(maxGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  // 2. 緊急性のある二重パルス警報ビープ音 (Emergency Dual High-Pitch Beep)
  public playEmergencyBeep() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // パルス 1
    this.triggerAlarmPulse(now, 2400, 1800, 0.045, 0.12);
    // パルス 2 (わずか 50ms 後に追撃発音)
    this.triggerAlarmPulse(now + 0.06, 2800, 2000, 0.045, 0.14);

    // ノイズ混入
    this.playNoiseBurst(0.08, 4000, 0.03);
  }

  public playBeep() {
    this.playEmergencyBeep();
  }

  // 3. 単一警報パルス波形（矩形波 ＋ ノコギリ波の緊迫ハーモニクス）
  private triggerAlarmPulse(startTime: number, startFreq: number, endFreq: number, duration: number, volume: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square'; // 鋭いデジタル矩形波
    osc1.frequency.setValueAtTime(startFreq, startTime);
    osc1.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    osc2.type = 'sawtooth'; // ざらついたノコギリ波
    osc2.frequency.setValueAtTime(startFreq * 0.5, startTime);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 0.5, startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  // 4. 投票確定時のノイジー・サイバーインダストリアル音 (YES / NO)
  public playVote(choice: 'YES' | 'NO') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (choice === 'YES') {
      // ⚡ YES: 高圧サイバー・データインジェクション（急速FMパルス ＋ ノイズバースト）
      this.playNoiseBurst(0.12, 5000, 0.05);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08); // 急上昇
      osc.frequency.setValueAtTime(2400, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.16);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      // 🚨 NO: 警戒ディストーション・重低音バズ（重工業サイバー警報）
      this.playNoiseBurst(0.15, 1200, 0.06);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    }
  }

  // 5. データ解禁・ミリタリー暗号突破音
  public playUnlock() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playNoiseBurst(0.2, 3500, 0.06);

    [1800, 2200, 2600, 3400].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);

      gain.gain.setValueAtTime(0.08, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.035 + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.05);
    });
  }

  // 6. タップ時の鋭いデジタルクリック
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.playNoiseBurst(0.02, 6000, 0.025);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(2800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }
}

export const cyberSound = new CyberSoundEngine();
