const common = require("../common");

const chai = common.chai;
const expect = chai.expect;

it("Connect to message exchange, send a text, receive it on the other side and update seen status.", function (done) {
  var user1InitObject = {
    headers: {
      user_id: common.user1._id,
      token: "Bearer " + common.user1.apiToken,
    },
  };

  var user2InitObject = {
    headers: {
      user_id: common.user2._id,
      token: "Bearer " + common.user2.apiToken,
    },
  };

  //Make both users online.
  common.user1.socketConnection.emit("_connect", user1InitObject);
  common.user2.socketConnection.emit("_connect", user2InitObject);

  //When user 1 is connected, send a message to user 2.
  common.user1.socketConnection.on("_connect", function (msg) {
    console.log(msg);
    expect(msg.ok).to.equal(1);

    const messageObject = {
      headers: {
        user_id: common.user1._id,
        token: "Bearer " + common.user1.apiToken,
      },
      payload: {
        id: Math.floor(Math.random() * 1000000 + 1),
        type: "text",
        thread_id: common.objectIds.threadId,
        content: "Hello!",
        password: common.user1.password,
      },
    };

    common.user1.socketConnection.emit("_messageOut", messageObject);

    common.user2.socketConnection.on("_messageIn", function (msg) {
      //Check incoming message of user 2 for proper content, tab and thread ids.
      expect(msg.content).to.equal("Hello!");
      expect(msg.sender).to.equal(common.user1._id.toString());
      expect(msg.type).to.equal("text");
      expect(msg.date_created).to.be.a("String");
      expect(msg.thread_id).to.equal(common.objectIds.threadId);

      const seenObject = {
        headers: {
          token: "Bearer " + common.user2.apiToken,
          user_id: common.user2._id,
        },
        payload: {
          thread_id: msg.thread_id,
          last_read_message_id: msg._id,
        },
      };

      //Update seen status.
      common.user2.socketConnection.emit("_updateMessageSeen", seenObject);

      //Verify seen status.
      common.user1.socketConnection.on("_messageSeen", function (seenStatus) {
        expect(seenStatus.thread_id).to.equal(common.objectIds.threadId);
        expect(seenStatus.last_read_message_id).to.equal(msg._id);

        done();
      });
    });
  });
});
