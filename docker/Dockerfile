FROM node:22-bookworm-slim

ARG LOCAL_UID=1000
ARG LOCAL_GID=1000
ARG AUTO_EDITOR_VERSION=31.5.0
ARG AUTO_EDITOR_SHA256=9c93cd57f8e29631355b96e97b081beddc95972119ceab43111656dd09a31dc5

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONNOUSERSITE=1 \
    UV_CACHE_DIR=/karve-data/cache/uv \
    XDG_CACHE_HOME=/karve-data/cache/xdg \
    HF_HOME=/karve-data/cache/huggingface \
    CHROME_BIN=/usr/bin/chromium \
    PATH=/opt/karve-venv/bin:${PATH}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        chromium \
        curl \
        ffmpeg \
        file \
        fontconfig \
        fonts-noto-core \
        fonts-noto-extra \
        fonts-noto-color-emoji \
        git \
        jq \
        libgomp1 \
        openssh-client \
        passwd \
        procps \
        python3 \
        python3-pip \
        python3-venv \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Keep orchestration dependencies inside the disposable image. ajv-cli provides
# deterministic JSON Schema validation for P4 artifacts.
RUN npm install --global pnpm@10 ajv-cli@5.0.0 \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# P5 adopts the upstream auto-editor CLI instead of reimplementing audio-based
# dead-space detection. Pin both release and checksum for reproducible builds.
RUN curl -fsSL \
      "https://github.com/WyattBlue/auto-editor/releases/download/${AUTO_EDITOR_VERSION}/auto-editor-linux-x86_64" \
      -o /usr/local/bin/auto-editor \
    && printf '%s  %s\n' "${AUTO_EDITOR_SHA256}" /usr/local/bin/auto-editor | sha256sum -c - \
    && chmod 0755 /usr/local/bin/auto-editor \
    && /usr/local/bin/auto-editor --version

# P3 Python runtime is isolated in the image. Model weights are not copied into
# the image; faster-whisper downloads them later to /karve-data/models/whisper.
COPY transcription/requirements.txt /tmp/karve-transcription-requirements.txt
RUN UV_CACHE_DIR=/tmp/karve-uv-build-cache uv venv /opt/karve-venv --python python3 \
    && UV_CACHE_DIR=/tmp/karve-uv-build-cache uv pip install \
        --python /opt/karve-venv/bin/python \
        --requirement /tmp/karve-transcription-requirements.txt \
    && rm -rf /tmp/karve-uv-build-cache /tmp/karve-transcription-requirements.txt

RUN if [ "$(getent group node | cut -d: -f3)" != "${LOCAL_GID}" ]; then groupmod --gid "${LOCAL_GID}" node; fi \
    && usermod --gid "${LOCAL_GID}" node \
    && if [ "$(id -u node)" != "${LOCAL_UID}" ]; then usermod --uid "${LOCAL_UID}" node; fi \
    && mkdir -p /workspace/karve /karve-data \
    && chown -R node:node /workspace /home/node

WORKDIR /workspace/karve
USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
