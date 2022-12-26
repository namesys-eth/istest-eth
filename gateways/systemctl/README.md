## Instructions for running persistent node service with `systemctl`

### `service` file

Put `istest.service` in `/etc/systemd/system/`

### Service `start` | `stop` | `restart`

`systemctl {start|stop|restart} istest.service`

### Verify

`journalctl -u istest.service`

FAQ: [https://github.com/natancabral/run-nodejs-on-service-with-systemd-on-linux/](Source)
