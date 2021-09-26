module.exports = {
  error: function () {
    const [socket, evt, reason] = arguments;

    const payload = {
      ok: 0,
      event: evt,
      reason: reason,
    };

    if (typeof arguments[5] === "object") {
      for (const key in arguments[5]) {
        payload[key] = arguments[5][key];
      }
    }

    socket.emit("_error", payload);
  },
  success: function () {
    const [socket, evt, result] = arguments;

    const payload = {
      ok: 1,
      event: evt,
    };

    if (typeof result === "object") {
      for (const key in result) {
        payload[key] = result[key];
      }
    }

    socket.emit("_success", payload);
  },
};
