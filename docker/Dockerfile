FROM node:22-bookworm-slim AS node-runtime

FROM ubuntu:24.04

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
    CHROME_BIN=/usr/bin/google-chrome-stable \
    REMOTION_BIN=/workspace/node_modules/.bin/remotion \
    NODE_PATH=/workspace/node_modules \
    PATH=/workspace/node_modules/.bin:/opt/karve-venv/bin:${PATH}

# Keep Node 22 from the official Node image while the final runtime remains on
# Ubuntu 24.04, matching auto-editor's official Linux release environment.
COPY --from=node-runtime /usr/local/ /usr/local/

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        ffmpeg \
        mesa-va-drivers \
        vainfo \
        file \
        fontconfig \
        fonts-noto-core \
        fonts-noto-extra \
        fonts-noto-color-emoji \
        git \
        gnupg \
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

# Ubuntu's chromium-browser package is a Snap transition. Install a normal
# container-safe browser from Google's signed repository for Remotion.
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor --yes -o /etc/apt/keyrings/google-chrome.gpg \
    && printf '%s\n' \
      'deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main' \
      > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Generic orchestration utilities remain inside the disposable image.
RUN npm install --global pnpm@10 ajv-cli@5.0.0 \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# P6 dependencies are exact-version pins. Install them in the parent workspace
# so the repository bind mount does not hide node_modules. The first P6 build
# can bootstrap from package.json; once scripts/p6-capture-lock.sh commits a
# package-lock.json, subsequent builds automatically switch to npm ci.
COPY package*.json /tmp/karve-node/
RUN mkdir -p /workspace \
    && cp /tmp/karve-node/package.json /workspace/package.json \
    && if [ -f /tmp/karve-node/package-lock.json ]; then \
         cp /tmp/karve-node/package-lock.json /workspace/package-lock.json; \
         npm ci --prefix /workspace --no-audit --no-fund; \
       else \
         npm install --prefix /workspace --no-audit --no-fund; \
       fi \
    && npm cache clean --force \
    && rm -rf /tmp/karve-node

# P5 adopts the upstream auto-editor CLI instead of reimplementing audio-based
# dead-space detection. Pin both release and checksum for reproducible builds.
RUN curl -fsSL \
      "https://github.com/WyattBlue/auto-editor/releases/download/${AUTO_EDITOR_VERSION}/auto-editor-linux-x86_64" \
      -o /usr/local/bin/auto-editor \
    && printf '%s  %s\n' "${AUTO_EDITOR_SHA256}" /usr/local/bin/auto-editor | sha256sum -c - \
    && chmod 0755 /usr/local/bin/auto-editor \
    && /usr/local/bin/auto-editor --version

# P3 Python runtime stays isolated. Model weights remain in persistent storage.
COPY transcription/requirements.txt /tmp/karve-transcription-requirements.txt
RUN UV_CACHE_DIR=/tmp/karve-uv-build-cache uv venv /opt/karve-venv --python python3 \
    && UV_CACHE_DIR=/tmp/karve-uv-build-cache uv pip install \
        --python /opt/karve-venv/bin/python \
        --requirement /tmp/karve-transcription-requirements.txt \
    && rm -rf /tmp/karve-uv-build-cache /tmp/karve-transcription-requirements.txt

# Match the normal WSL user's numeric UID/GID. Ubuntu 24.04 ships with a default
# 'ubuntu' user at UID 1000. If present, remove it so we can create/configure 'node'.
RUN set -eux; \
    if id -u ubuntu >/dev/null 2>&1; then \
      userdel -r ubuntu 2>/dev/null || true; \
    fi; \
    if getent group ubuntu >/dev/null 2>&1; then \
      groupdel ubuntu 2>/dev/null || true; \
    fi; \
    if ! getent group "${LOCAL_GID}" >/dev/null; then \
      groupadd --gid "${LOCAL_GID}" node; \
    fi; \
    if getent passwd "${LOCAL_UID}" >/dev/null; then \
      existing_user="$(getent passwd "${LOCAL_UID}" | cut -d: -f1)"; \
      if [ "${existing_user}" != "node" ]; then \
        printf 'Requested UID %s is already owned by unexpected user %s\n' "${LOCAL_UID}" "${existing_user}" >&2; \
        exit 1; \
      fi; \
      usermod --gid "${LOCAL_GID}" node; \
    else \
      useradd --uid "${LOCAL_UID}" --gid "${LOCAL_GID}" --create-home --shell /bin/bash node; \
    fi; \
    mkdir -p /workspace/karve /karve-data /home/node; \
    chown -R "${LOCAL_UID}:${LOCAL_GID}" /workspace /karve-data /home/node

WORKDIR /workspace/karve
USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
