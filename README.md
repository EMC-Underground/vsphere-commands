# hubot-vsphere-commands

A hubot script that allows users to interact with the vsphere-rest-api developed by quickjp2 on github.

See [`src/vsphere-commands.coffee`](src/vsphere-commands.coffee) for full documentation.

## Installation

In hubot project repo, run:

`npm install hubot-vsphere-commands --save`

Then add **hubot-vsphere-commands** to your `external-scripts.json`:

```json
[
  "hubot-vsphere-commands"
]
```

Once this is complete, add the config file to your base hubot directory

'touch v-config.json'

Add the following to that file:

```json
{
  "url": "<vSphere-api-url>"
}
```
