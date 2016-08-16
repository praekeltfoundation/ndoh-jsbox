# NDOH MomConnect Apps

## Example registrations

// PMTCT

    ```
    // pmtct prebirth
    data: {
        "reg_type": "pmtct_prebirth",
        "registrant_id": "cb245673-aa41-4302-ac47-00000000007",  // identity id
        "data": {
            "operator_id": "cb245673-aa41-4302-ac47-00000000007",  // device owner id
            "language": "eng_ZA",  // chosen message language
            "mom_dob": "1954-05-29",  // mother's date of birth
            "edd": "2016-09-07"  // estimated due date
        }
    }
    ```

    ```
    // pmtct postbirth
    data: {
        "reg_type": "pmtct_postbirth",
        "registrant_id": "cb245673-aa41-4302-ac47-00000000007",  // identity id
        "data": {
            "operator_id": "cb245673-aa41-4302-ac47-00000000007",  // device owner id
            "language": "eng_ZA",  // chosen message language
            "mom_dob": "1954-05-29",  // mother's date of birth
            "baby_dob": "2015-11-11"  // baby's date of birth
        }
    }
    ```

// NURSECONNECT

    ```
    // nurseconnect
    data: {
        "reg_type": "nurseconnect",
        "registrant_id": "cb245673-aa41-4302-ac47-00000000007",  // identity id
        "data": {
            "operator_id": "cb245673-aa41-4302-ac47-00000000007",  // device owner id
            "msisdn_registrant": "+27821235555",  // msisdn of the registrant
            "msisdn_device": "+27821234444",  // device msisdn
            "faccode": "123456"  // facility code
        }
    }
    ```
