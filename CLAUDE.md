# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unity Frame Timing Visualizer is a standalone interactive web application that simulates and visualizes CPU/GPU pipelining, graphics command queue behavior, and frame pipeline depth in Unity-style rendering. It's a purely client-side educational tool with no build process or dependencies.

## Architecture

### Core Simulation Model (script.js:43-125)

The `simulate()` function is the heart of the application. It models 6 frames of CPU-GPU pipeline behavior with these key mechanics:

- **Graphics Command Queue Management**: Tracks `queuedDrawCalls` that accumulate as the CPU generates draw calls and are freed when the GPU begins processing a frame
- **Frame Pipeline Gating**: Enforces `maxFramesAhead` limit by blocking CPU work until earlier frames' GPU work completes
- **Queue Saturation**: CPU waits when `queuedDrawCalls + drawCalls > queueCapacity`
- **Release Scheduling**: Uses a `releases` array to track when queue space becomes available (when GPU starts processing)

Key timing calculations per frame:
- CPU waits are computed first (frame pipeline limit, then queue space)
- Script execution and draw call generation run sequentially on CPU
- GPU start time is `max(renderEnd, prevGpuEnd)` to handle both CPU-bound and GPU-bound scenarios
- Draw calls occupy queue space from `renderEnd` until `gpuStart`

### Rendering Architecture (script.js:150-273)

The timeline visualization uses percentage-based positioning where `scale()` converts milliseconds to percentages based on total simulation duration. Frames are stacked vertically with 24px spacing and different vertical offsets for bar types (8px for CPU bars, 16px for GPU bars).

### Interactive Constraints (script.js:326-371)

The controls have bidirectional enforcement:
- Increasing `drawCalls` above `queueCapacity` automatically expands the queue capacity
- Decreasing `queueCapacity` below `drawCalls` automatically reduces draw calls
- Skip flags (`skipDrawCallsUpdate`, `skipQueueCapacityUpdate`) prevent infinite update loops

## Development

This is a static site with no build process. Open `index.html` directly in a browser to run the application.

### File Structure

- `index.html` - DOM structure, control inputs, and metrics display
- `script.js` - Simulation engine, timeline rendering, metrics computation
- `style.css` - Dark theme styling with CSS custom properties

### Key DOM References

All interactive elements are cached at startup in `controls` object (script.js:1-8). Metric displays are in `metrics` object (script.js:16-23). Timeline lanes are `cpuLane` and `gpuLane`.

### Making Changes

When modifying simulation logic:
1. Changes to frame timing calculations happen in `simulate()` (script.js:43-125)
2. The `frames` array structure determines what data is available for rendering and metrics
3. Bottleneck detection logic is in `computeMetrics()` (script.js:286-295)

When modifying visualization:
1. Bar creation happens in `createBar()` (script.js:127-137) with positioning via `scale()`
2. Timeline axis tick generation uses adaptive intervals in `renderTimeline()` (script.js:158-175)
3. Color scheme is defined in CSS custom properties (style.css:1-14)

### Performance Considerations

The simulation runs on every slider input event. The 6-frame simulation window balances visual clarity with performance. Increasing `framesToSim` (script.js:44) shows more frames but increases computation.
