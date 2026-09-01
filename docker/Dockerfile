FROM node:22-bookworm-slim

ARG LOCAL_UID=1000
ARG LOCAL_GID=1000

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

RUN npm install --global pnpm@10 \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

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
