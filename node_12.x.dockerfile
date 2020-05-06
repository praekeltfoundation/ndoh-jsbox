FROM praekeltfoundation/vxsandbox:node_12.x
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

# Copy in the app Javascript
COPY go-*.js /app/
COPY config /app/config

RUN pip install raven==3.5.2
