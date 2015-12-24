// Description
//   A hubot script that allows users to interact with the vsphere-rest-api developed by quickjp2 on github.
//
// Dependencies:
//    NONE
//
// Configuration:
//    NONE
//
// Commands:
//    hubot list all vms - Lists out all vms
//    hubot show vm <uuid> - Shows description of the vm specified
//    hubot delete vm <uuid> - Deletes the vm specified
//    hubot create me vm - Opens up a dialogue with you to create a new vm
//    hubot change vm <uuid> - Opens up a dialogue with you to modify the specified vm
//
// Notes:
//    Requires a file named "v-config.json". See the example for what to include.
//
// Author:
//   quickjp2
(function() {
  var authToken, data, fs, http;

  fs = require('fs');

  http = require('http');

  data = {};

  fs.readFile('./v-config.json', function(err, contents) {
    if (err) {
      return console.log("Encountered an error: " + err);
    } else {
      return data = JSON.parse(contents.toString());
    }
  });
  var responses = ["sweet", "cool", "awesome", "fair enough"," sounds good", "ok",
                    "fantastic", "roger that", "got it", "perfect"]
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  authToken = "";

  module.exports = function(robot) {
    robot.respond(/(list all vms)/i, function(msg) {
      return robot.http(data['url'] + "vms/").get()(function(err, res, body) {
        var all_vms, i, j, len, vm, vms;
        if (err) {
          robot.logger.info("Encountered an error: " + err);
        } else {
          msg.send("We got vms..and there's a lot...let me filter this for you...please wait");
          vms = JSON.parse(body)['vm'];
          i = 0;
          all_vms = {
            "1": "Name: " + vms[i]['name'] + " UUID: " + vms[i]['instanceUuid'] + " OS: " + vms[i]['guestFullName']
          };
          i = 1;
          for (j = 0, len = vms.length; j < len; j++) {
            vm = vms[j];
            all_vms[i + 1] = "Name: " + vm['name'] + " UUID: " + vm['instanceUuid'] + " OS: " + vm['guestFullName'];
            i = i + 1;
          }
          robot.logger.info(all_vms);
          return msg.send("" + (JSON.stringify(all_vms, null, 2)));
        }
      });
    });
    robot.respond(/(show vm) (.*)/i, function(msg) {
      var uuid;
      uuid = msg.match[2];
      msg.send("Searching for vm with uuid of " + uuid);
      return robot.http(data['url'] + ("vms/" + uuid + "/")).get()(function(err, res, body) {
        if (err) {
          robot.logger.info("Encountered an error: " + err);
        } else {
          return msg.send("" + body);
        }
      });
    });
    robot.respond(/(delete vm) (.*)/i, function(msg) {
      var uuid;
      uuid = msg.match[2];
      msg.send("Deleting vm with uuid of " + uuid);
      return robot.http(data['url'] + ("vms/" + uuid + "/"))["delete"]()(function(err, res, body) {
        if (err) {
          robot.logger.info("Encountered an error: " + err);
        } else {
          return msg.send("" + body);
        }
      });
    });
    robot.respond(/(create me vm)/i, function(msg) {
      robot.send({
        room: msg.envelope.user.name
      }, "Lets do it! First, how much memory in megabytes?(Format: mem <num>)");
      robot.respond(/(mem) (.*)/i, function(memMSG) {
        var memory;
        memory = memMSG.match[2];
        robot.send({
          room: msg.envelope.user.name
        }, "Now how many cpus? (Format: cpus <num>)");
        robot.respond(/(cpus) (.*)/i, function(cpuMSG) {
          var cpu;
          cpu = cpuMSG.match[2];
          robot.send({
            room: msg.envelope.user.name
          }, "What would you like to call it? (Please no spaces; format: name <name>)");
          robot.respond(/(name) (.*)/i, function(nameMSG) {
            var name;
            name = nameMSG.match[2];
            robot.send({
              room: msg.envelope.user.name
            }, "One more thing...what's the os? Sadly we can only do Ubuntu so far, so please type: os ubuntu");
            robot.respond(/(os) (.*)/i, function(guestMSG) {
              var guestid, payload;
              guestid = guestMSG.match[2];
              if (guestid === "ubuntu") {
                guestid = "ubuntu64Guest";
              } else {
                guestid = "ubuntu64Guest";
              }
              guestMSG.send responses[Math.floor(Math.random()* responses.length)]
              robot.send({
                room: msg.envelope.user.name
              }, "Making a " + guestid + " vm named " + name + " with " + memory + " megabytes of memory and " + cpu + " CPUs");
              payload = {
                datastore: "scaleio_vmw",
                mem: "" + memory,
                cpus: "" + cpu,
                name: "" + name,
                guestid: "" + guestid,
                vm_version: "vmx-10",
                user: "" + msg.envelope.user.name
              };
              return robot.http(data['url'] + "vms/").header('Content-Type', 'application/json').post(JSON.stringify(payload))(function(err, res, body) {
                if (err) {
                  robot.logger.info("Encountered an error: " + err);
                  robot.send({
                    room: msg.envelope.user.name
                  }, "Encountered an error: " + err);
                } else {
                  robot.send({
                    room: msg.envelope.user.name
                  }, "" + body);
                  return msg.send("I have created a vm with this payload " + (JSON.stringify(payload, null, 2)));
                }
              });
              return
            });
            return
          });
          return
        });
        return
      });
      return
    });

    robot.respond(/(change vm) (.*)/i, function(msg) {
      var payload, uuid;
      robot.send({
        room: msg.envelope.user.name
      }, "That's a perfectly good vm...but ok! Let's do it!");
      uuid = msg.match[2];
      payload = {};
      robot.send({
        room: msg.envelope.user.name
      }, "Here's the uuid of the vm you want to change: " + uuid);
      robot.send({
        room: msg.envelope.user.name
      }, "Either specify the amount of cpus or type no cpu to skip. (ie. 2 cpu or no cpu)");
      robot.respond(/(.*) (cpu)/i, function(q1) {
        var cpus;
        cpus = q1.match[1];
        if (cpus !== "no") {
          cpus = parseInt(cpus, 10);
          robot.logger.info("Sending to the parser");
          payload["cpu"] = "" + cpus;
        }
        robot.send({
          room: msg.envelope.user.name
        }, "Either specify the new amount of megabytes or tpye no mem to skip. (ie. 1024 mem or no mem)");
        robot.respond(/(.*) (mem)/i, function(q2) {
          var mem;
          mem = q2.match[1];
          if (mem !== "no") {
            mem = parseInt(mem, 10);
            payload["mem"] = "" + mem;
          }
          robot.logger.info("Sending packet");
          return robot.http(data['url'] + ("vms/" + uuid + "/")).header('Content-Type', 'application/json').put(JSON.stringify(payload))(function(err, res, body) {
            if (err) {
              robot.logger.info("Encountered an error: " + err);
              robot.send({
                room: msg.envelope.user.name
              }, "Encountered an error: " + err);
            } else {
              robot.send({
                room: msg.envelope.user.name
              }, "" + body);
              return msg.send("I have modified the vm (uuid: " + uuid + ") to have these specs: " + payload);
            }
          });
        });
      });
    });
  };

}).call(this);
