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
    PATH=/opt/karve-venv/bin:${PATH}

# Keep Node 22 from the official Node image while moving the final runtime to
# Ubuntu 24.04. This avoids a remote NodeSource bootstrap script and leaves the
# final image on the same libc generation used by auto-editor's Linux release.
COPY --from=node-runtime /usr/local/ /usr/local/

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        ffmpeg \
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

# Ubuntu 24.04's chromium-browser package is a Snap transition, which is not a
# good container dependency. Install Google Chrome from its signed Debian repo
# instead and expose the executable through CHROME_BIN for future Remotion use.
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor --yes -o /etc/apt/keyrings/google-chrome.gpg \
    && printf '%s\n' \
      'deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main' \
      > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
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

# Match the normal WSL user's numeric UID/GID without assuming that either ID
# maps to a particular name in the Ubuntu base image. Reuse an existing group
# with the requested GID, but fail rather than silently repurpose an unrelated
# existing user if the requested UID is already occupied.
RUN set -eux; \
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
