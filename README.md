# NDOH MomConnect Apps

Registration and Change submission formats can be found here:
https://github.com/praekeltfoundation/ndoh-hub/blob/develop/README.md

## Generating translations

You can run a command like this from the `config/` directory to update
the JSON files when the PO catalogs change:

```
find . -name "go-app-ussd_popi_faq.*po" -exec jspot json {} \;
```

To generate pot file run this command on config directory

Run ```jspot extract file.js -k '$'```

Use Poedit to edit .po files, and run this command to sync the changes to .json file
```
jspot json go-app-ussd_tb_check.xho_ZA.po
```

## Trying out the applications

There is a docker compose setup that should allow someone to easily get all the
components up and running to be able to easily try out the USSD lines.

Requirements:
 - docker
 - docker-compose
 - curl
 - telnet

Firstly, change to the docker-compose folder and run the `up` command:
```
cd docker-compose
docker-compose up
```

Then, once all the services are up and running, run the setup script for the
initial setup of all the services:
```
./setup.sh
```

Then, you can use telnet to access the various USSD lines:
 - Public USSD: `telnet localhost 9001`
 - POPI User Data USSD: `telnet localhost 9002`

Currently, only the English language is set up and working. Any other language
selections will result in an error

Example:
```
~ telnet localhost 9001

Escape character is '^]'.
Please provide "to_addr":
*120*1234#
Please provide "from_addr":
+27821234567
[Sending all messages to: *120*1234# and from: +27821234567]
Welcome to the Department of Health's MomConnect. Please select your language
1. isiZulu
2. isiXhosa
3. Afrikaans
4. English
5. Sesotho sa Leboa
6. More
```

### Updating Higher Health institution data

The current latest data is from: 23 March 2021

You can update the list of higher health institutions, given a list of CSV files with that info, by
using the following command, followed by updating this README:
```
npm run hh_update_institutions data1.csv data2.csv data3.csv
```
