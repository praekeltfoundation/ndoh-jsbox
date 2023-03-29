# TODO: Replace this with a non-parameterized "production" image before merging
ARG NODEJS_VERSION="18"
FROM ghcr.io/praekeltfoundation/vumi-sandbox:node${NODEJS_VERSION}-no-wheelhouse-5d4e1a1
MAINTAINER Praekelt Foundation <dev@praekeltfoundation.org>

# Install nodejs dependencies
COPY package.json /app/package.json
COPY config/go-app-ussd_popi*.json /app/
COPY config/go-app-ussd_pmtct*.json /app/
WORKDIR /app
RUN npm install --production

# Workaround for sandboxed application losing context - manually install the
# *dependencies* globally.
# See https://github.com/praekelt/vumi-sandbox/issues/15
RUN mv ./node_modules /usr/local/lib/
# RUN mv ./node_modules /usr/local/site-packages/vxsandbox/

# Copy in the app Javascript
COPY go-*.js /app/
COPY config /app/config

RUN pip install raven==3.5.2
