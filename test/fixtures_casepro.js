module.exports = function() {
    return [
        {
            // 242: relay message to case pro
            "key": "post.casepro.testing_message_idmessage.0170b7bb-978e-4b8a-35d2-662af5b6daee",
            "request": {
                "url": 'http://casepro/',
                "method": 'POST',
                "data": {
                    "from": "+27820001002",
                    "message_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee",
                    "content": "DONUTS"
                }
            },
            "response": {}
        }
    ];
};
