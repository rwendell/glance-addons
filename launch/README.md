# Launching Glance

Optional startup templates for Glance. They all read the same environment file,
so widget profile values live in one place:

```text
~/.config/glance/glance.env
```

Copy `glance.env.example` to `glance.env` and fill in the values you need. The
widget READMEs list which variables each widget uses.

## Linux: user systemd unit

Copy the unit and env file:

```sh
mkdir -p ~/.config/systemd/user
cp launch/glance.service ~/.config/systemd/user/glance.service
cp launch/glance.env.example ~/.config/glance/glance.env
```

Edit `~/.config/glance/glance.env`, then adjust `ExecStart` in the unit if
`glance` is not at `~/.local/bin/glance`.

```sh
systemctl --user daemon-reload
systemctl --user enable --now glance.service
```

To run it without an active login session:

```sh
loginctl enable-linger "$USER"
```

## Windows: hidden startup script

Copy the env file:

```bat
copy launch\glance.env.example "%USERPROFILE%\.config\glance\glance.env"
```

Edit `%USERPROFILE%\.config\glance\glance.env`, then copy
`start-glance.vbs` somewhere permanent, for example:

```bat
copy launch\start-glance.vbs "%USERPROFILE%\.config\glance\start-glance.vbs"
```

Create a shortcut to that `.vbs` in your Startup folder. Open
`shell:startup` with Win+R and place the shortcut there. The script starts
Glance hidden and sets the env vars only for that process.

If you prefer a visible console, use `start-glance.cmd` the same way.

Adjust the `glance.exe` and `glance.yml` paths in the Windows scripts if your
layout differs from `%USERPROFILE%\.local\bin\glance.exe` and
`%USERPROFILE%\.config\glance\glance.yml`.
