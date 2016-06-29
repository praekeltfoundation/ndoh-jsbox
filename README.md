# mama-ng-jsbox

National Department of Health's JSbox app
Contains logic for Registration and State Changes
Probably the first proper Vumi Voice app
Does not have access to the usual contactstore and metricstore - uses mama-ng-control instead

    $ npm install
    $ npm test


## Translations

Install jspot

    $ npm install -g jspot

Export pot files and move to config folder

    $ jspot extract go-sms_inbound.js -k $
    $ mv messages.pot config/go-sms_inbound.pot
    $ jspot extract go-ussd_public.js -k $
    $ mv messages.pot config/go-ussd_public.pot
    $ jspot extract go-ussd_registration.js -k $
    $ mv messages.pot config/go-ussd_registration.pot
