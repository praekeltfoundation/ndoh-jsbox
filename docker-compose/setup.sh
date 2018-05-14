#!/bin/bash
set -e

## Create the required models
# auth
echo "
from django.contrib.auth.models import User
user = User.objects.create_superuser('admin', 'admin@example.org', 'admin')
from rest_framework.authtoken.models import Token
Token.objects.create(user=user, key='b229801c76c68fb5b70075d08182bf1de681bb87')
" | docker-compose run identitystore django-admin shell
# registration source
echo "
from django.contrib.auth.models import User
user = User.objects.get(username='admin')
from registrations.models import Source
Source.objects.create(user=user, authority='hw_full')
" | docker-compose run hub django-admin shell

# Create the Junebug channels
curl -X POST -H 'Content-Type: application/json' -d '{
    "amqp_queue": "jsbox_public_ussd",
    "type": "telnet_addr",
    "config": {
        "twisted_endpoint": "tcp:9001"
    }
    }' localhost/jb/channels/
