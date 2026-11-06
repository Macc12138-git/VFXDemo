# Local Editor performance

Unity 6000.3.19f1, Apple M5, Metal, 2340x1080; all CPU/GPU values are whole-frame Editor median / P95, not effect-only. 2 repetitions, 1.7s warmup / 3.3s sample.

| Variant / count | Frames | Batches P95 / max | Draws P95 / max | SetPass P95 | Main ms | Render ms | GPU ms | Particle Update ms | Peak particles | GC median bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| none / 0 | 2314 | 6 / 6 | 6 / 6 | 6 | 0.488 / 0.747 | 0.763 / 1.155 | 0.953 / 1.729 | 0.001 / 0.002 | 0 | 9767 |
| 2D / 1 | 2322 | 16 / 17 | 16 / 17 | 8 | 0.560 / 0.685 | 0.792 / 0.932 | 1.024 / 1.684 | 0.012 / 0.015 | 63 | 9767 |
| 3D / 1 | 2144 | 15 / 17 | 15 / 17 | 8 | 0.562 / 0.812 | 0.785 / 1.034 | 0.951 / 1.707 | 0.011 / 0.016 | 63 | 9767 |
| 2D / 8 | 1740 | 78 / 94 | 78 / 94 | 8 | 0.767 / 1.636 | 0.836 / 1.204 | 1.128 / 2.313 | 0.060 / 0.096 | 504 | 9767 |
| 3D / 8 | 2008 | 78 / 94 | 78 / 94 | 9 | 0.738 / 1.195 | 0.824 / 1.122 | 1.131 / 1.869 | 0.058 / 0.085 | 504 | 9767 |
| 2D / 32 | 1309 | 230 / 358 | 230 / 358 | 9 | 1.391 / 2.402 | 0.948 / 2.287 | 1.587 / 2.989 | 0.241 / 0.331 | 2016 | 9767 |
| 3D / 32 | 1333 | 262 / 358 | 262 / 358 | 10 | 1.357 / 2.376 | 0.932 / 2.345 | 1.600 / 2.994 | 0.233 / 0.334 | 2016 | 9767 |
| 3D / 8 staggered | 1939 | 25 / 26 | 25 / 26 | 9 | 0.803 / 0.991 | 0.864 / 0.986 | 1.179 / 1.900 | 0.061 / 0.078 | 125 | 9767 |

The burst is short and most of a 1.9s loop is empty; median draw/particle count hides its peak. This is exploratory 0/1/8/32, not a production concurrency budget. Baseline differences are estimates only. GC includes Editor/probe overhead.
Shared resource runtime memory: meshes 2300544 bytes, materials 4992 bytes (Unity Profiler runtime size, not total GPU allocation). No textures.

Detailed batch reasons, per-pass GPU/overdraw, target Player variants/device budget and long-run memory remain unverified. No algorithm-performance optimization claim is made; BeforeLightCalibration records the earlier visual calibration baseline.
