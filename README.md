# NDOH MomConnect Apps

Registration and Change submission formats can be found here:
https://github.com/praekeltfoundation/ndoh-hub/blob/develop/README.md

## Generating translations

You can run a command like this from the `config/` directory to update
the JSON files when the PO catalogs change:

```
find . -name "go-app-ussd_popi_faq.*po" -exec jspot json {} \;
```
