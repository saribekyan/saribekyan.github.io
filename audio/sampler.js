/* Plays real instrument recordings for the sing-along scores.
   Each instrument has a recording every three semitones; notes in between are
   pitch-shifted from the nearest one. Sustained instruments loop the steady middle
   of their 3-second recordings, so long notes can be held as long as needed.

   Usage:
     await Sampler.load(ctx, 'piano');                 // fetch + decode once (cached)
     Sampler.play(ctx, dest, 'piano', 60, when, dur, vol);  // returns the source node
*/
(function(){
  const NAMES_SHARP = { C:0, Cs:1, D:2, Ds:3, E:4, F:5, Fs:6, G:7, Gs:8, A:9, As:10, B:11 };
  const NAMES_FLAT  = { C:0, Db:1, D:2, Eb:3, E:4, F:5, Gb:6, G:7, Ab:8, A:9, Bb:10, B:11 };
  const range = (from, to, names) => {           // every minor third, as file names
    const out = [], order = Object.keys(names);
    for (let m = from; m <= to; m += 3) out.push(order.find(n => names[n] === m % 12) + (Math.floor(m / 12) - 1));
    return out;
  };
  const midiOf = (name, names) => { const m = name.match(/^([A-G][sb]?)(-?\d)$/); return names[m[1]] + 12 * (+m[2] + 1); };

  // gains roughly even out the recordings' loudness (flute set a little above the piano)
  const INSTRUMENTS = {
    piano:      { dir: '/audio/piano/',      files: range(33, 93, NAMES_SHARP), names: NAMES_SHARP, sustain: false, gain: 2.0 },
    flute:      { dir: '/audio/flute/',      files: range(48, 93, NAMES_FLAT),  names: NAMES_FLAT,  sustain: true,  gain: 4.0 },
  };

  const cache = new Map();   // instrument -> Promise<[{midi, buf}]>

  function decode(ctx, data){
    return new Promise((ok, fail) => {
      const p = ctx.decodeAudioData(data, ok, fail);   // callback form for older Safari
      if (p && p.then) p.then(ok, fail);
    });
  }

  function load(ctx, inst){
    if (!cache.has(inst)) {
      const I = INSTRUMENTS[inst];
      cache.set(inst, Promise.all(I.files.map(f =>
        fetch(I.dir + f + '.mp3').then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
          .then(d => decode(ctx, d)).then(buf => ({ midi: midiOf(f, I.names), buf }))
      )).catch(e => { cache.delete(inst); throw e; }));
    }
    return cache.get(inst);
  }

  const loaded = {};   // instrument -> samples, once decoded (so play() can stay synchronous)
  async function ready(ctx, inst){ loaded[inst] = await load(ctx, inst); return loaded[inst]; }

  function play(ctx, dest, inst, midi, when, dur, vol){
    const samples = loaded[inst]; if (!samples) return null;
    const I = INSTRUMENTS[inst];
    let s = samples[0];
    for (const x of samples) if (Math.abs(x.midi - midi) < Math.abs(s.midi - midi)) s = x;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = s.buf;
    src.playbackRate.value = Math.pow(2, (midi - s.midi) / 12);
    const rate = src.playbackRate.value, len = s.buf.duration / rate;   // real-time length of the recording
    const v = (vol == null ? 0.5 : vol) * I.gain;
    let end;
    if (I.sustain) {
      if (dur > len - 0.6) { src.loop = true; src.loopStart = 1.0; src.loopEnd = Math.min(2.4, s.buf.duration - 0.4); }
      const rel = 0.12;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(v, when + 0.03);
      g.gain.setValueAtTime(v, when + Math.max(0.03, dur - rel));
      g.gain.linearRampToValueAtTime(0, when + dur);
      end = when + dur + 0.02;
    } else {                                    // piano: let it ring, then damp
      const rel = 0.25;
      g.gain.setValueAtTime(v, when);
      g.gain.setValueAtTime(v, when + dur);
      g.gain.setTargetAtTime(0, when + dur, rel / 3);
      end = Math.min(when + len, when + dur + rel * 2);
    }
    src.connect(g); g.connect(dest);
    src.start(when); src.stop(end);
    return src;
  }

  // Two volume channels (voice, piano) into a limiter, so each part's volume can change live.
  // synthVoice/synthPiano are softened inputs for the old synthesized sound (used if recordings fail to load).
  function mixer(ctx){
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12; lim.connect(ctx.destination);
    const voice = ctx.createGain(), piano = ctx.createGain(); voice.connect(lim); piano.connect(lim);
    const soft = dest => { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000; f.connect(dest); return f; };
    return { voice, piano, synthVoice: soft(voice), synthPiano: soft(piano) };
  }
  function setLevel(ctx, bus, value){ bus.gain.setTargetAtTime(value, ctx.currentTime, 0.03); }

  window.Sampler = { INSTRUMENTS, load, ready, play, mixer, setLevel };
})();
