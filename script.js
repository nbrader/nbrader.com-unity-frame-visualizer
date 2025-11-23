const controls = {
  scriptTime: document.getElementById('scriptTime'),
  drawCalls: document.getElementById('drawCalls'),
  genFactor: document.getElementById('genFactor'),
  procFactor: document.getElementById('procFactor'),
  queueCapacity: document.getElementById('queueCapacity'),
  maxFramesAhead: document.getElementById('maxFramesAhead'),
};

const valueSpans = document.querySelectorAll('.value');
const cpuLane = document.getElementById('cpuLane');
const gpuLane = document.getElementById('gpuLane');
const timeAxis = document.getElementById('timeAxis');
const explanationText = document.getElementById('explanationText');

const metrics = {
  frameTime: document.getElementById('frameTime'),
  fps: document.getElementById('fps'),
  bottleneck: document.getElementById('bottleneck'),
  queueUse: document.getElementById('queueUse'),
  queuedFrames: document.getElementById('queuedFrames'),
  inputLatency: document.getElementById('inputLatency'),
};

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function updateValueLabels() {
  valueSpans.forEach((el) => {
    const id = el.dataset.for;
    const input = controls[id];
    el.textContent = input.id === 'maxFramesAhead' || input.id === 'drawCalls' || input.id === 'queueCapacity'
      ? input.value
      : Number(input.value).toFixed(3);
  });
}

function simulate(params) {
  const framesToSim = 6;
  const frames = [];
  let prevRenderEnd = 0;
  let prevGpuEnd = 0;
  let queuedDrawCalls = 0;
  const releases = [];

  const settleReleases = (time) => {
    // Free queue space for any frame whose GPU work has started.
    for (let i = releases.length - 1; i >= 0; i--) {
      if (releases[i].time <= time) {
        queuedDrawCalls = Math.max(0, queuedDrawCalls - releases[i].amount);
        releases.splice(i, 1);
      }
    }
  };

  for (let i = 0; i < framesToSim; i++) {
    const script = params.scriptTime;
    const render = params.drawCalls * params.genFactor;
    const gpuDuration = params.drawCalls * params.procFactor;
    const frame = { index: i };

    let start = prevRenderEnd;
    let waitFramesAhead = 0;
    let waitFramesAheadStart = 0;
    let waitQueue = 0;
    let waitQueueStart = 0;

    settleReleases(start);

    if (i - params.maxFramesAhead >= 0 && frames[i - params.maxFramesAhead]) {
      const gateTime = frames[i - params.maxFramesAhead].gpuEnd;
      if (gateTime > start) {
        waitFramesAheadStart = start;
        waitFramesAhead = gateTime - start;
        start = gateTime;
        settleReleases(start);
      }
    }

    const queueWaitStart = start;
    while (queuedDrawCalls + params.drawCalls > params.queueCapacity) {
      const nextRelease = releases.length ? Math.min(...releases.map((r) => r.time)) : Infinity;
      if (!Number.isFinite(nextRelease)) break;
      const waitUntil = Math.max(start, nextRelease);
      waitQueue += waitUntil - start;
      start = waitUntil;
      settleReleases(start);
    }
    if (waitQueue > 0) {
      waitQueueStart = queueWaitStart;
    }

    frame.waitFramesAhead = waitFramesAhead;
    frame.waitFramesAheadStart = waitFramesAheadStart;
    frame.waitQueue = waitQueue;
    frame.waitQueueStart = waitQueueStart;
    frame.scriptStart = start;
    frame.scriptEnd = frame.scriptStart + script;
    frame.renderStart = frame.scriptEnd;
    frame.renderEnd = frame.renderStart + render;

    // Draw calls enter the queue at renderEnd until the GPU begins this frame.
    queuedDrawCalls += params.drawCalls;
    const queueSnapshot = queuedDrawCalls;

    frame.gpuStart = Math.max(frame.renderEnd, prevGpuEnd);
    frame.gpuIdle = Math.max(0, frame.renderEnd - prevGpuEnd);
    frame.gpuWait = Math.max(0, prevGpuEnd - frame.renderEnd);
    frame.gpuEnd = frame.gpuStart + gpuDuration;
    frame.gpuDuration = gpuDuration;
    frame.queueUse = queueSnapshot;

    releases.push({ time: frame.gpuStart, amount: params.drawCalls });
    frames.push(frame);
    prevRenderEnd = frame.renderEnd;
    prevGpuEnd = frame.gpuEnd;
  }

  return frames;
}

function createBar({ lane, start, end, label, type, row, frameIndex, verticalOffset }) {
  const bar = document.createElement('div');
  bar.className = `bar ${type}`;
  bar.textContent = label;
  bar.style.left = `${start}%`;
  bar.style.width = `${Math.max(0.5, end - start)}%`;
  const defaultOffset = type === 'gpu' ? 16 : 8;
  bar.style.top = `${frameIndex * 24 + (verticalOffset !== undefined ? verticalOffset : defaultOffset)}px`;
  lane.appendChild(bar);
  return bar;
}

function createMarker(track, timePercent, text) {
  const marker = document.createElement('div');
  marker.className = 'frame-marker';
  marker.style.left = `${timePercent}%`;
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = text;
  marker.appendChild(label);
  track.appendChild(marker);
}

function renderTimeline(frames, params) {
  cpuLane.innerHTML = '';
  gpuLane.innerHTML = '';
  timeAxis.innerHTML = '';

  const lastGpuEnd = Math.max(...frames.map((f) => f.gpuEnd));
  const scale = (value) => (value / lastGpuEnd) * 100;

  // Calculate nice interval based on powers of 10
  // Aim for 5-10 ticks to avoid overlap
  const targetTicks = 8;
  const roughInterval = lastGpuEnd / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));

  // Choose best multiplier (1, 2, 5, or 10) of the magnitude
  const candidates = [magnitude, 2 * magnitude, 5 * magnitude, 10 * magnitude];
  let interval = candidates[0];
  let bestDiff = Math.abs(candidates[0] - roughInterval);

  for (const candidate of candidates) {
    const diff = Math.abs(candidate - roughInterval);
    if (diff < bestDiff) {
      interval = candidate;
      bestDiff = diff;
    }
  }

  // Generate ticks at multiples of the interval
  let tickIndex = 0;
  for (let time = 0; time <= lastGpuEnd; time += interval) {
    const pos = scale(time);
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.left = `${pos}%`;
    const label = document.createElement('span');
    // Format with appropriate precision based on magnitude
    const decimals = interval < 1 ? 2 : interval < 10 ? 1 : 0;
    label.textContent = `${time.toFixed(decimals)} ms`;
    // Left-align the first tick label so it starts at 0
    if (tickIndex === 0) {
      label.style.transform = 'translateX(0)';
    }
    tick.appendChild(label);
    timeAxis.appendChild(tick);
    tickIndex++;
  }

  frames.forEach((frame) => {
    const yIndex = frame.index % 6;
    if (frame.waitFramesAhead > 0) {
      createBar({
        lane: cpuLane,
        start: scale(frame.waitFramesAheadStart),
        end: scale(frame.waitFramesAheadStart + frame.waitFramesAhead),
        label: 'CPU Wait (Frame Pipeline)',
        type: 'wait',
        frameIndex: yIndex,
      });
    }
    if (frame.waitQueue > 0) {
      createBar({
        lane: cpuLane,
        start: scale(frame.waitQueueStart),
        end: scale(frame.waitQueueStart + frame.waitQueue),
        label: 'CPU Wait (Queue Full)',
        type: 'wait',
        frameIndex: yIndex,
      });
    }

    createBar({
      lane: cpuLane,
      start: scale(frame.scriptStart),
      end: scale(frame.scriptEnd),
      label: 'CPU Scripts',
      type: 'script',
      frameIndex: yIndex,
    });

    createBar({
      lane: cpuLane,
      start: scale(frame.renderStart),
      end: scale(frame.renderEnd),
      label: 'Render Thread',
      type: 'render',
      frameIndex: yIndex,
    });

    if (frame.gpuIdle > 0) {
      createBar({
        lane: gpuLane,
        start: scale(frame.gpuStart - frame.gpuIdle),
        end: scale(frame.gpuStart),
        label: 'GPU Idle',
        type: 'wait',
        frameIndex: yIndex,
      });
    }

    if (frame.gpuWait > 0) {
      createBar({
        lane: gpuLane,
        start: scale(frame.gpuStart - frame.gpuWait),
        end: scale(frame.gpuStart),
        label: 'GPU Wait',
        type: 'wait',
        frameIndex: yIndex,
        verticalOffset: 12,
      });
    }

    createBar({
      lane: gpuLane,
      start: scale(frame.gpuStart),
      end: scale(frame.gpuEnd),
      label: 'GPU Execution',
      type: 'gpu',
      frameIndex: yIndex,
    });

    createMarker(cpuLane, scale(frame.scriptStart), `Frame ${frame.index}`);
    createMarker(gpuLane, scale(frame.gpuEnd), `Present ${frame.index}`);
  });
}


function computeMetrics(frames, params) {
  if (frames.length < 2) return;

  const last = frames[frames.length - 1];
  const prev = frames[frames.length - 2];
  const frameTime = last.gpuEnd - prev.gpuEnd;
  const fps = 1000 / frameTime;
  const queueOccupancy = Math.max(...frames.map((f) => f.queueUse));
  const queued = frames.filter((f) => f.gpuEnd > last.renderEnd).length;

  const bottleneck = (() => {
    if (last.waitQueue > 0) return 'Queue Full';
    if (last.waitFramesAhead > 0) return 'Frame Pipeline Limit';
    const cpuCost = params.scriptTime + params.drawCalls * params.genFactor;
    const gpuCost = params.drawCalls * params.procFactor;
    if (cpuCost > gpuCost) {
      return params.scriptTime >= params.drawCalls * params.genFactor ? 'CPU Scripts' : 'CPU Render';
    }
    return 'GPU';
  })();

  metrics.frameTime.textContent = formatMs(frameTime);
  metrics.fps.textContent = fps.toFixed(1);
  metrics.bottleneck.textContent = bottleneck;
  metrics.queueUse.textContent = `${formatNumber(queueOccupancy)} / ${formatNumber(params.queueCapacity)}`;
  metrics.queuedFrames.textContent = `${queued} / ${params.maxFramesAhead}`;
  metrics.inputLatency.textContent = formatMs(last.gpuEnd - last.scriptStart);
}


function updateExplanation(params) {
  const text = [
    `Scripts take ${params.scriptTime} ms, generating ${params.drawCalls} draw calls in ${(params.drawCalls * params.genFactor).toFixed(2)} ms on the CPU.`,
    `The GPU processes these draw calls in ${(params.drawCalls * params.procFactor).toFixed(2)} ms while the graphics command queue can hold ${params.queueCapacity} draw calls (minimum: ${params.drawCalls}).`,
    `The CPU can work ${params.maxFramesAhead} frames ahead; beyond that, it waits for GPU completion or queue space.`,
  ];
  explanationText.textContent = text.join(' ');
}

function readParams() {
  return {
    scriptTime: Number(controls.scriptTime.value),
    drawCalls: Number(controls.drawCalls.value),
    genFactor: Number(controls.genFactor.value),
    procFactor: Number(controls.procFactor.value),
    queueCapacity: Number(controls.queueCapacity.value),
    maxFramesAhead: Number(controls.maxFramesAhead.value),
  };
}

let skipDrawCallsUpdate = false;
let skipQueueCapacityUpdate = false;

function update() {
  updateValueLabels();
  const params = readParams();
  const frames = simulate(params);
  renderTimeline(frames, params);
  computeMetrics(frames, params);
  updateExplanation(params);
}

// Add event listeners with two-way constraint enforcement
controls.drawCalls.addEventListener('input', () => {
  if (skipDrawCallsUpdate) {
    skipDrawCallsUpdate = false;
    return;
  }

  const drawCalls = Number(controls.drawCalls.value);
  const queueCapacity = Number(controls.queueCapacity.value);

  // If draw calls exceed queue capacity, expand queue to match
  if (drawCalls > queueCapacity) {
    skipQueueCapacityUpdate = true;
    controls.queueCapacity.value = drawCalls;
  }
  update();
});

controls.queueCapacity.addEventListener('input', () => {
  if (skipQueueCapacityUpdate) {
    skipQueueCapacityUpdate = false;
    return;
  }

  const drawCalls = Number(controls.drawCalls.value);
  const queueCapacity = Number(controls.queueCapacity.value);

  // If queue capacity is smaller than draw calls, reduce draw calls to match
  if (queueCapacity < drawCalls) {
    skipDrawCallsUpdate = true;
    controls.drawCalls.value = queueCapacity;
  }
  update();
});

// Add standard event listeners for other controls
[controls.scriptTime, controls.genFactor, controls.procFactor, controls.maxFramesAhead].forEach((input) => {
  input.addEventListener('input', update);
});

update();
