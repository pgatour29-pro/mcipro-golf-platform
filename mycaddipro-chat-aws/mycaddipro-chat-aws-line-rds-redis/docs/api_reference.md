## REST
- POST /v1/messages
- GET /v1/messages?conversation_id&after_cursor
- POST /v1/receipts
- POST /v1/typing/start, POST /v1/typing/stop
- POST /v1/attachments/presign
- POST /v1/channels
- GET  /v1/channels/:id
- POST /v1/presence/set, GET /v1/presence/get/:user_id
- POST /v1/webhooks/replay

## WS
- /v1/realtime  (subscribe: {type:'subscribe', conversation_id})
- server pushes: {type:'message'| 'typing', payload}
