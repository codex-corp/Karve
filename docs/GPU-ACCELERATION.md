# Optional Intel Arc GPU export in WSL2

## Status

Karve keeps CPU execution as the canonical baseline. GPU acceleration is optional and currently validated only for **Intel Arc AV1 hardware encoding through WSL2 D3D12 VA-API**.

The validated path is:

```text
Karve/FFmpeg in Docker
        -> VA-API (av1_vaapi)
        -> Mesa d3d12_drv_video.so
        -> /dev/dri/card0 + /dev/dxg
        -> WSL D3D12
        -> Windows Intel driver
        -> Intel Arc hardware encoder
```

The current GPU helper intentionally performs CPU decode followed by `format=nv12,hwupload` and Arc AV1 encode. Full VA-API decode/encode and H.264/HEVC encoding are not part of the accepted Karve path until they pass the same container gate on the target host.

## Why GPU output is derivative-only

P5 is already accepted with deterministic FFmpeg H.264 rough cuts, and P6 verification currently expects H.264/AAC canonical output. Replacing those artifacts with AV1 would change an accepted cross-phase contract.

GPU export therefore creates a separate derivative file and never mutates `rough-cut.mp4`, `p6-<profile>.mp4`, timeline maps, transcripts, or semantic artifacts.

## Host prerequisites

WSL must expose:

```text
/dev/dxg
/dev/dri/card0
/dev/dri/renderD128
```

`card0` and `renderD128` must be real DRM character devices. On the accepted WSL kernel, load `vgem` when they are absent:

```bash
sudo modprobe vgem
ls -l /dev/dri
```

Expected shape:

```text
crw-rw---- ... card0
crw-rw---- ... renderD128
```

Do not replace these with symlinks to `/dev/dxg`.

For persistent host setup:

```bash
echo vgem | sudo tee /etc/modules-load.d/vgem.conf
```

## Container support

The base Karve image installs:

```text
ffmpeg
mesa-va-drivers
vainfo
```

GPU-specific device passthrough is isolated in `docker-compose.gpu.yml` so ordinary CPU runs remain unchanged.

The overlay passes the three WSL video devices, mounts `/usr/lib/wsl`, preserves the host DRM supplemental group IDs, and sets:

```text
LIBVA_DRIVER_NAME=d3d12
GALLIUM_DRIVER=d3d12
MESA_D3D12_DEFAULT_ADAPTER_NAME=Arc
LD_LIBRARY_PATH=/usr/lib/wsl/lib
```

Override the adapter selector when needed:

```bash
export KARVE_GPU_ADAPTER_NAME='Arc'
```

## Validate the container path

Rebuild after adding the Mesa packages:

```bash
bash scripts/bootstrap.sh
```

Then run:

```bash
bash scripts/gpu-doctor.sh
```

The gate requires all of the following inside the Karve container:

- WSL devices are present as character devices;
- `/usr/lib/wsl/lib` is mounted;
- Mesa `d3d12_drv_video.so` exists;
- `vainfo` opens `/dev/dri/card0` through the D3D12 backend;
- FFmpeg exposes `av1_vaapi`;
- a 5-second synthetic AV1 hardware encode completes successfully.

## Export a Karve output with Arc AV1

Example:

```bash
bash scripts/gpu-export.sh \
  ~/karve-data/projects/sample-3-large/p6-source.mp4 \
  ~/karve-data/projects/sample-3-large/p6-source.av1.mkv
```

Custom bitrate:

```bash
bash scripts/gpu-export.sh input.mp4 output.av1.mkv --bitrate 8M
```

Replace an existing derivative explicitly:

```bash
bash scripts/gpu-export.sh input.mp4 output.av1.mkv --force
```

The FFmpeg video path is equivalent to:

```bash
-vaapi_device /dev/dri/card0 \
-vf 'format=nv12,hwupload' \
-c:v av1_vaapi
```

Audio is stream-copied by default.

## Deferred GPU integration

Do not change P5's canonical renderer to `av1_vaapi`: P6 consumes the P5 media and the current verification contract is H.264-based.

A future opt-in P5 H.264 GPU encoder is reasonable only after `h264_vaapi` passes the same target-container gate and its rate-control/output compatibility are validated against existing P5/P6 verification. CPU must remain the default/fallback.
