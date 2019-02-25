module.exports = function(){
    return {
        send_message: function(params) {
            params = params || {};
            var to_identity = params.to_identity || 'operator-id';
            var to_addr = params.to_addr || '+27820001001';
            var content = params.content || 'Test message';
            var channel = params.channel || null;
            var metadata = params.metadata || {};
            var data = {
                to_identity: to_identity,
                to_addr: to_addr,
                content: content,
                metadata: metadata,
            };
            if(channel) {
                data.channel = channel;
            }
            return {
                request: {
                    method: "POST",
                    url: "http://ms/api/v1/outbound/",
                    data: data
                },
                response: {
                    code: 201,
                    data: {}
                }
            };
        },
        javascript: "commas"
    };
};
