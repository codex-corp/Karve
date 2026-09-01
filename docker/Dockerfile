FROM node:22-bookworm-slim

ARG LOCAL_UID=1000
ARG LOCAL_GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/karve-data/cache/uv \
    XDG_CACHE_HOME=/karve-data/cache/xdg

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
        procps \
        python3 \
        python3-pip \
        python3-venv \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Keep package managers inside the disposable image rather than installing them on Windows/WSL globally.
RUN corepack enable \
    && corepack prepare pnpm@10 --activate \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# The official Node image already ships a non-root `node` user. Align its UID/GID
# with the WSL user so repository bind mounts do not become root-owned.
RUN if [ "$(id -g node)" != "${LOCAL_GID}" ]; then groupmod --gid "${LOCAL_GID}" node; fi \
    && if [ "$(id -u node)" != "${LOCAL_UID}" ]; then usermod --uid "${LOCAL_UID}" --gid "${LOCAL_GID}" node; fi \
    && mkdir -p /workspace/karve /karve-data \
    && chown -R node:node /workspace /home/node

WORKDIR /workspace/karve

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
