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

responses = ["sweet", "cool", "awesome", "fair enough"," sounds good", "ok", "fantastic", "roger that", "got it", "perfect"]

get_cpus = (robot, username, home, packet, creating) ->
  # Get data from user
  robot.send {room: username}, "Now how many cpus? (Format: cpus <num>)"
  robot.respond /(cpus) (.*)/i, (cpuMSG) ->
    cpu = cpuMSG.match[2]
    # Add to packet
    packet['cpus'] = cpu
    cpuMSG.send responses[Math.floor(Math.random()* responses.length)]
    if creating
      create_vm(robot, username, home, 3, packet)

get_mem = (robot, username, home, packet, creating) ->
  # Get data from user
  robot.send {room: username}, "First, how much memory in megabytes?(Format: mem <num>)"
  robot.respond /(mem) (.*)/i, (memMSG) ->
    memory = memMSG.match[2]
    # Add to packet
    packet['mem'] = memory
    memMSG.send responses[Math.floor(Math.random()* responses.length)]
    if creating
      create_vm(robot, username, home, 2, packet)

get_vm_name = (robot, username, home, packet, creating) ->
  # Get data from user
  robot.send {room: username}, "What would you like to call it? (Please no spaces; format: name <name>)"
  robot.respond /(name) (.*)/i, (nameMSG) ->
    name = nameMSG.match[2]
    # Add to packet
    packet['name'] = name
    nameMSG.send responses[Math.floor(Math.random()* responses.length)]
    if creating
      create_vm(robot, username, home, 4, packet)

get_vm_guestid = (robot, username, home, packet, creating) ->
  # Get data from user
  robot.send {room: username}, "One more thing...what's the os? Sadly we can only do Ubuntu so far, so please type: os ubuntu"
  robot.respond /(os) (.*)/i, (guestMSG) ->
    guestid = guestMSG.match[2]
    if guestid == "ubuntu"
      guestid = "ubuntu64Guest"
    else
      guestid = "ubuntu64Guest"
    # Add to packet
    packet['guestid'] = guestid
    guestMSG.send responses[Math.floor(Math.random()* responses.length)]
    if creating
      create_vm(robot, username, home, 5, packet)

send_api_packet = (robot, username, home, packet, url) ->
  # Send a packet to the api
  robot.http(url)
    .header('Content-Type', 'application/json')
    .post(JSON.stringify(packet)) (err, res, body) ->
      if err
        robot.logger.info "Encountered an error: #{err}"
        robot.send {room: username}, "Encountered an error: #{err}"
      else
        robot.send {room: username}, "#{body}"
        robot.send {room: home}, "I have created a vm with this payload #{JSON.stringify(packet, null, 2)}"

# Contains all function calls that are needed to create a vm
create_vm = (robot, username, home, count, packet) ->
  switch count
    when 1 then get_mem(robot, username, home, packet, true)
    when 2 then get_cpus(robot, username, home, packet, true)
    when 3 then get_vm_name(robot, username, home, packet, true)
    when 4 then get_vm_guestid(robot, username, home, packet, true)
    when 5
      robot.send {room: username}, "Making a #{packet['guestid']}
                                    vm named #{packet['name']}
                                    with #{packet['mem']}
                                    megabytes of memory and #{packet['cpus']} CPUs"
      url = data['url'] + "vms/"
      send_api_packet(robot, username, home, packet, url)

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
          i = 0
          all_vms = "1": "Name: #{vms[i]['name']} UUID: #{vms[i]['instanceUuid']} OS: #{vms[i]['guestFullName']}"
          i = 1
          for vm in vms
            all_vms[i+1] = "Name: #{vm['name']} UUID: #{vm['instanceUuid']} OS: #{vm['guestFullName']}"
            i = i + 1
          robot.logger.info all_vms
          msg.send "#{JSON.stringify(all_vms, null, 2)}"

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
    robot.send {room: msg.envelope.user.name}, "Lets do it!"
    packet = {datastore:"scaleio_vmw", vm_version:"vmx-10", user:"#{msg.envelope.user.name}"}
    create_vm(robot, msg.envelope.user.name, msg.envelope.room, 1, packet)

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
