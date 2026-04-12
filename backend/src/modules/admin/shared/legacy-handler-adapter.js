function runLegacyHandler(handler, req) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const headers = {};

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        headers[name] = value;
      },
      json(payload) {
        settled = true;
        resolve({
          status: this.statusCode || 200,
          body: payload,
          headers,
        });
        return this;
      },
      send(payload) {
        settled = true;
        resolve({
          status: this.statusCode || 200,
          body: payload,
          headers,
        });
        return this;
      },
      end(payload) {
        settled = true;
        resolve({
          status: this.statusCode || 200,
          body: payload,
          headers,
        });
        return this;
      },
    };

    const next = (error) => {
      if (settled) {
        return;
      }
      if (error) {
        reject(error);
        return;
      }
      settled = true;
      resolve({
        status: res.statusCode || 204,
        body: null,
        headers,
      });
    };

    Promise.resolve(handler(req, res, next))
      .then(() => {
        if (!settled) {
          settled = true;
          resolve({
            status: res.statusCode || 204,
            body: null,
            headers,
          });
        }
      })
      .catch(reject);
  });
}

function sendLegacyResult(res, result) {
  const { status, body, headers } = result;

  for (const [headerName, headerValue] of Object.entries(headers || {})) {
    res.setHeader(headerName, headerValue);
  }

  if (body == null) {
    return res.status(status).send();
  }

  if (Buffer.isBuffer(body)) {
    return res.status(status).send(body);
  }

  if (typeof body === "object") {
    return res.status(status).json(body);
  }

  return res.status(status).send(body);
}

module.exports = {
  runLegacyHandler,
  sendLegacyResult,
};
