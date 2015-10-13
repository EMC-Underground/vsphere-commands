# Description
#   A hubot script that allows users to interact with the vsphere-rest-api developed by quickjp2 on github.
#
# Dependencies:
#    NONE
#
# Configuration:
#    NONE
#
# Commands:
#    hubot list all vms - Lists out all vms
#    hubot show vm <uuid> - Shows description of the vm specified
#    hubot delete vm <uuid> - Deletes the vm specified
#    hubot create me vm - Opens up a dialogue with you to create a new vm
#    hubot change vm <uuid> - Opens up a dialogue with you to modify the specified vm
#
# Notes:
#    Requires a file named "v-config.json". See the example for what to include.
#
# Author:
#   quickjp2

fs = require 'fs'
http = require 'http'
data = {}

fs.readFile './v-config.json', (err, contents) ->
  if err
    console.log "Encountered an error: #{err}"
  else
    data = JSON.parse(contents.toString())

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
authToken = ""

printVM = (msg, vms, i, robot)->
  if vms[i] != undefined
    robot.logger.info "Name: #{vms[i]['name']} UUID: #{vms[i]['instanceUuid']} OS: #{vms[i]['guestFullName']}"
    msg.send "Name: #{vms[i]['name']} UUID: #{vms[i]['instanceUuid']} OS: #{vms[i]['guestFullName']}"
    i = i + 1
    setTimeout (-> printVM msg, vms, i, robot),500
  else
    msg.send "Done and ready to receive more commands!"


module.exports = (robot) ->

  robot.respond /(list all vms)/i, (msg) ->
    robot.http(data['url']+"vms/")
      .get() (err, res, body) ->
        if err
          robot.logger.info "Encountered an error: #{err}"
          return
        else
          msg.send "We got vms..and there's a lot...let me filter this for you...please wait"
          vms = JSON.parse(body)['vm']
          i=0
          robot.logger.info "Name: #{vms[i]["name"]} UUID: #{vms[i]['instanceUuid']} OS: #{vms[i]['guestFullName']}"
          msg.send "Name: #{vms[i]["name"]} UUID: #{vms[i]['instanceUuid']} OS: #{vms[i]['guestFullName']}"
          i = i + 1
          setTimeout (-> printVM msg, vms, i, robot), 500

  robot.respond /(show vm) (.*)/i, (msg) ->
    uuid = msg.match[2]
    msg.send "Searching for vm with uuid of #{uuid}"
    robot.http(data['url'] + "vms/#{uuid}/")
      .get() (err, res, body) ->
        if err
          robot.logger.info "Encountered an error: #{err}"
          return
        else
          msg.send "#{body}"

  robot.respond /(delete vm) (.*)/i, (msg) ->
    uuid = msg.match[2]
    msg.send "Deleting vm with uuid of #{uuid}"
    robot.http(data['url'] + "vms/#{uuid}/")
      .delete() (err, res, body) ->
        if err
          robot.logger.info "Encountered an error: #{err}"
          return
        else
          msg.send "#{body}"

  robot.respond /(create me vm)/i, (msg) ->
    robot.send {room: msg.envelope.user.name}, "Lets do it! First, how much memory in megabytes?(Format: <num> mem)"
    robot.respond /(.*) (mem)/i, (memMSG) ->
      memory = memMSG.match[1]
      robot.send {room: msg.envelope.user.name}, "Now how many cpus? (Format: <num> cpus)"
      robot.respond /(.*) (cpus)/i, (cpuMSG) ->
        cpu = cpuMSG.match[1]
        robot.send {room: msg.envelope.user.name}, "What would you like to call it? (Please no spaces; format: name <name>)"
        robot.respond /(name) (.*)/i, (nameMSG) ->
          name = nameMSG.match[2]
          robot.send {room: msg.envelope.user.name}, "One more thing...what's the os? Please use vmware's guestid. (Format: guestid <guestid>)"
          robot.respond /(guestid) (.*)/i, (guestMSG) ->
            guestid = guestMSG.match[2]
            robot.send {room: msg.envelope.user.name}, "Making a #{guestid} vm named #{name} with #{memory} megabytes of memory and #{cpu} CPUs"
            payload = {datastore:"scaleio_vmw", mem:"#{memory}", cpus:"#{cpu}", name:"#{name}", guestid:"#{guestid}", vm_version:"vmx-10"}
            robot.http(data['url'] + "vms/")
              .header('Content-Type', 'application/json')
              .post(JSON.stringify(payload)) (err, res, body) ->
                if err
                  robot.logger.info "Encountered an error: #{err}"
                  robot.send {room: msg.envelope.user.name}, "Encountered an error: #{err}"
                  return
                else
                  robot.send {room: msg.envelope.user.name}, "#{body}"
                  msg.send "I have created a vm with this payload #{payload}"
                  return
            return
          return
        return 
      return    

  #TODO show what the current changable specs are before asking what to change
  robot.respond /(change vm) (.*)/i, (msg) ->
    robot.send {room: msg.envelope.user.name}, "That's a perfectly good vm...but ok! Let's do it!"
    uuid = msg.match[2]
    payload = {}
    robot.send {room: msg.envelope.user.name}, "Here's the uuid of the vm you want to change: #{uuid}"
    robot.send {room: msg.envelope.user.name}, "Either specify the amount of cpus or type no cpu to skip. (ie. 2 cpu or no cpu)"
    robot.respond /(.*) (cpu)/i, (q1) ->
      cpus = q1.match[1]
      if cpus != "no"
        cpus = parseInt(cpus, 10)
        robot.logger.info "Sending to the parser"
        payload["cpu"] = "#{cpus}"
      robot.send {room: msg.envelope.user.name}, "Either specify the new amount of megabytes or tpye no mem to skip. (ie. 1024 mem or no mem)"
      robot.respond /(.*) (mem)/i, (q2) ->
        mem = q2.match[1]
        if mem != "no"
          mem = parseInt(mem, 10)
          payload["mem"] = "#{mem}"
        robot.logger.info "Sending packet"
        robot.http(data['url']+"vms/#{uuid}/")
          .header('Content-Type', 'application/json')
          .put(JSON.stringify(payload)) (err, res, body) ->
            if err
              robot.logger.info "Encountered an error: #{err}"
              robot.send {room: msg.envelope.user.name}, "Encountered an error: #{err}"
              return
            else
              robot.send {room: msg.envelope.user.name}, "#{body}"
              msg.send "I have modified the vm (uuid: #{uuid}) to have these specs: #{payload}"
      return
    return
