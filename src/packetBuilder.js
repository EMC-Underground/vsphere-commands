// The Dialog class is used to handle questions that should be asked in a dialog with the user

class PacketBuilder {
  constructor(msg, questions, url)(
    this.msg = msg;
    this.user = this.msg.message.user;
    this.room = this.msg.message.room;
    this.responses;
    this.questions = questions;
    this.responders = {};
    this.salutations = ["sweet", "cool", "awesome", "fair enough"," sounds good", "ok",
                      "fantastic", "roger that", "got it", "perfect"]
    return init();
  )

  init(){
    this.responses = [];
    _this = this;
    for(var i = 0; i < this.questions.length; i++){
      var single = this.questions[i];
      var response = {'key': '', 'question': '', 'answer': ''};
      response.key = single.dataname;
      response.question = single.question;
      msg.respond(single.regex, function(msg, i, _this){
        _this.responses[i].answer = msg.match[2];
        msg.send(_this.salutations[Math.floor(Math.random()* responses.length)]);
        _this.askQuestion(i+1);
      });
      var index = this.msg.listeners.length - 1;
      this.responses.push(response);
      this.responders[single.regex] = index;
    }
    return this;
  }
  // Clean up the used responders
  cleanUp(){
    for(var i = this.questions.length; i >= 0; i--){
      var index = this.responders[questions[i].regex];
      this.msg.listeners.splice(index, 1, function(){});
      delete this.responders[questions[i].regex];
    }
  }

  // Spin up the next question
  askQuestion(num){
    // If the num is equal to the length, time to send the packet!
    if (num >= this.questions.length){
      sendPacket();
    }
    else{
      this.msg.send({room: this.user.name}, "" + this.responses[num].question);
    }
  }

  sendPacket(){
    this.msg.send({
      room: this.msg.envelope.user.name
    }, "Making a " + guestid + " vm named " + name + " with " + memory + " megabytes of memory and " + cpu + " CPUs");
    payload = {
      datastore: "scaleio_vmw",
      mem: "" + memory,
      cpus: "" + cpu,
      name: "" + name,
      guestid: "" + guestid,
      vm_version: "vmx-10",
      user: "" + this.msg.envelope.user.name
    };
    this.msg.http(this.url).header('Content-Type', 'application/json').post(JSON.stringify(payload))(function(err, res, body) {
      if (err) {
        this.msg.logger.info("Encountered an error: " + err);
        this.msg.send({
          room: this.msg.envelope.user.name
        }, "Encountered an error: " + err);
      } else {
        this.msg.send({
          room: this.msg.envelope.user.name
        }, "" + body);
        msg.send({room: this.room}, "I have created a vm with this payload " + (JSON.stringify(payload, null, 2)));
      }
    });
    cleanUp();
  }
}
