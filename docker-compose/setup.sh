#!/bin/bash
set -e

## Create the required models
# identitystore
echo "
from django.contrib.auth.models import User
user = User.objects.create_superuser('admin', 'admin@example.org', 'admin')
from rest_framework.authtoken.models import Token
Token.objects.create(user=user, key='b229801c76c68fb5b70075d08182bf1de681bb87')
" | docker-compose run identitystore django-admin shell
# registration
echo "
from django.contrib.auth.models import User
user = User.objects.create_superuser('admin', 'admin@example.org', 'admin')
from rest_framework.authtoken.models import Token
Token.objects.create(user=user, key='b229801c76c68fb5b70075d08182bf1de681bb87')
from registrations.models import Source
Source.objects.create(user=user, authority='hw_full')
" | docker-compose run hub django-admin shell
# stage based messaging
echo "
from django.contrib.auth.models import User
user = User.objects.create_superuser('admin', 'admin@example.org', 'admin')
from rest_framework.authtoken.models import Token
Token.objects.create(user=user, key='b229801c76c68fb5b70075d08182bf1de681bb87')
" | docker-compose run sbm django-admin shell
# message sender
echo "
from django.contrib.auth.models import User
user = User.objects.create_superuser('admin', 'admin@example.org', 'admin')
from rest_framework.authtoken.models import Token
Token.objects.create(user=user, key='b229801c76c68fb5b70075d08182bf1de681bb87')
" | docker-compose run messagesender django-admin shell

# Create the Junebug channels
curl -X POST -H 'Content-Type: application/json' -d '{
    "amqp_queue": "jsbox_public_ussd",
    "type": "telnet_addr",
    "config": {
        "twisted_endpoint": "tcp:9001"
    }
    }' localhost/jb/channels/

curl -X POST -H 'Content-Type: application/json' -d '{
    "amqp_queue": "jsbox_popi_user_data_ussd",
    "type": "telnet_addr",
    "config": {
        "twisted_endpoint": "tcp:9002"
    }
    }' localhost/jb/channels/
