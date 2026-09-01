FROM node:22-bookworm-slim

ARG LOCAL_UID=1000
ARG LOCAL_GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/karve-data/cache/uv \
    XDG_CACHE_HOME=/karve-data/cache/xdg \
    HF_HOME=/karve-data/cache/huggingface \
    CHROME_BIN=/usr/bin/chromium

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
        openssh-client \
        passwd \
        procps \
        python3 \
        python3-pip \
        python3-venv \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Keep package managers inside the disposable image instead of installing them
# globally on Windows or the WSL distribution.
RUN npm install --global pnpm@10 \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# Match the WSL user's UID/GID so bind-mounted repository files never become
# root-owned when commands run inside the container.
RUN if [ "$(getent group node | cut -d: -f3)" != "${LOCAL_GID}" ]; then groupmod --gid "${LOCAL_GID}" node; fi \
    && usermod --gid "${LOCAL_GID}" node \
    && if [ "$(id -u node)" != "${LOCAL_UID}" ]; then usermod --uid "${LOCAL_UID}" node; fi \
    && mkdir -p /workspace/karve /karve-data \
    && chown -R node:node /workspace /home/node

WORKDIR /workspace/karve
USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
