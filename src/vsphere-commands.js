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
      data = JSON.parse(contents.toString());
      return data;
    }
  });
  var responses = ["sweet", "cool", "awesome", "fair enough", " sounds good", "ok",
    "fantastic", "roger that", "got it", "perfect"
  ];
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  authToken = "";

  var PacketBuilder = function(robot, msg, questions, url) {
    this.robot = robot;
    this.msg = msg;
    this.user = this.msg.message.user;
    this.room = this.msg.message.room;
    this.questions = questions;
    this.responders = {};
    this.salutations = ["sweet", "cool", "awesome", "fair enough", " sounds good", "ok",
      "fantastic", "roger that", "got it", "perfect"
    ];
    this.responses = [];
    for (var i = 0; i < this.questions.length; i++) {
      this.robot.logger.info("We're at index " + i);
      var single = this.questions[i];
      var response = {
        'key': '',
        'question': '',
        'answer': ''
      };
      response.key = single.dataname;
      response.question = single.question;
      this.responses.push(response);
    }
  };
  // Clean up the used responders
  PacketBuilder.prototype.cleanUp = function() {
    for (var i = this.questions.length; i >= 0; i--) {
      var index = this.responders[questions[i].regex];
      this.robots.listeners.splice(index, 1, function() {});
      delete this.responders[questions[i].regex];
    }
  };

  // Spin up the next question
  PacketBuilder.prototype.askQuestion = function(num) {
    // If the num is equal to the length, time to send the packet!
    if (num >= this.questions.length) {
      this.sendPacket();
    } else {
      _this = this;
      this.robot.send({
        room: this.user.name
      }, "" + this.responses[num].question);
      this.robot.respond(this.questions[num].regex, function(msg) {
        _this.robot.logger.info("This callback has: " + num);
        _this.responses[num].answer = msg.match[2];
        _this.robot.send({
            room: _this.user.name
          },
          _this.salutations[Math.floor(Math.random() * responses.length)]);
        askQuestion(num + 1);
      });
      var index = this.robot.listeners.length - 1;
      this.responders[this.questions[num].regex] = index;
    }
  };

  PacketBuilder.prototype.sendPacket = function() {
    payload = {
      datastore: "scaleio_vmw",
      vm_version: "vmx-10",
      user: "" + this.msg.envelope.user.name
    };
    for (var i = 0; i < responses.length; i++) {
      payload[responses[i].key] = responses[i].answer;
    }
    this.msg.send({
        room: this.msg.envelope.user.name
      }, "Making a " + payload.guestid +
      " vm named " + payload.name +
      " with " + payload.mem +
      " megabytes of memory and " + payload.cpus + " CPUs");
    this.robot.http(this.url).header('Content-Type', 'application/json').post(JSON.stringify(payload))(function(err, res, body) {
      if (err) {
        this.robot.logger.info("Encountered an error: " + err);
        this.msg.send({
          room: this.msg.envelope.user.name
        }, "Encountered an error: " + err);
      } else {
        this.msg.send({
          room: this.msg.envelope.user.name
        }, "" + body);
        this.msg.send({
          room: this.room
        }, "I have created a vm with this payload " + (JSON.stringify(payload, null, 2)));
      }
    });
    cleanUp();
  };

  module.exports = function(robot) {
    robot.respond(/(list all vms)/i, function(msg) {
      return robot.http(data.url + "vms/").get()(function(err, res, body) {
        var all_vms, i, j, len, vm, vms;
        if (err) {
          robot.logger.info("Encountered an error: " + err);
        } else {
          msg.send("We got vms..and there's a lot...let me filter this for you...please wait");
          vms = JSON.parse(body).vm;
          i = 0;
          all_vms = {
            "1": "Name: " + vms[i].name + " UUID: " + vms[i].instanceUuid + " OS: " + vms[i].guestFullName
          };
          i = 1;
          for (j = 0, len = vms.length; j < len; j++) {
            vm = vms[j];
            all_vms[i + 1] = "Name: " + vm.name + " UUID: " + vm.instanceUuid + " OS: " + vm.guestFullName;
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
      return robot.http(data.url + ("vms/" + uuid + "/")).get()(function(err, res, body) {
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
      return robot.http(data.url + ("vms/" + uuid + "/"))["delete"]()(function(err, res, body) {
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
      }, "Lets do it!");
      var questions = [{
        'question': 'How much memory in megabytes?(Format: mem <num>)',
        'dataname': 'mem',
        'regex': '(memory|mem)(\s\d)(.*)?'
      }, {
        'question': 'Now how many cpus? (Format: cpus <num>)',
        'dataname': 'cpus',
        'regex': '/(cpus) (.*)/i'
      }, {
        'question': 'What would you like to call it? (Please no spaces; format: name <name>)',
        'dataname': 'name',
        'regex': '/(name) (.*)/i'
      }, {
        'question': 'One more thing...what is the os? Sadly we can only do Ubuntu so far, so please type: os ubuntu',
        'dataname': 'guestid',
        'regex': '/(os) (.*)/i'
      }];
      var createVMPacket = new PacketBuilder(robot, msg, questions, data.url + "vms/");
      createVMPacket.askQuestion(0);
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
          payloa.cpu = "" + cpus;
        }
        robot.send({
          room: msg.envelope.user.name
        }, "Either specify the new amount of megabytes or tpye no mem to skip. (ie. 1024 mem or no mem)");
        robot.respond(/(.*) (mem)/i, function(q2) {
          var mem;
          mem = q2.match[1];
          if (mem !== "no") {
            mem = parseInt(mem, 10);
            payload.mem = "" + mem;
          }
          robot.logger.info("Sending packet");
          return robot.http(data.url + ("vms/" + uuid + "/")).header('Content-Type', 'application/json').put(JSON.stringify(payload))(function(err, res, body) {
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
