## Persistent node.js service with `systemctl`

### Service file

- Put `istest.service.conf` in `/etc/systemd/system/`

### Service Handling

- Start: `systemctl start istest.service`
- Stop: `systemctl stop istest.service`

### Verify

- `journalctl -u istest.service`

FAQ: [Source](https://github.com/natancabral/run-nodejs-on-service-with-systemd-on-linux/)
