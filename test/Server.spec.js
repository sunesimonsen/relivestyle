const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const Server = require("../lib/Server");

const TEST_DATA = path.join(__dirname, "..", "testdata");

function runBlockInServer(server, blockFn) {
    const closeServer = () => new Promise(resolve => server.close(resolve));

    return new Promise(resolve => {
        server.listen(0, resolve);
    })
        .then(() => blockFn(server.address()))
        .then(() => closeServer())
        .catch(e =>
            closeServer().then(() => {
                throw e;
            })
        );
}

describe("Server", () => {
    it("should allow a websocket connection", () => {
        const servePath = path.join(TEST_DATA, "example-project");

        const server = new Server({ servePath });

        return runBlockInServer(server, address => {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(
                    `ws://localhost:${address.port}/__livestyle`
                );
                ws.on("error", e => {
                    reject(e);
                });
                ws.on("open", () => {
                    resolve();
                });
            });
        });
    });

    describe("when a file changes", () => {
        const servePath = path.join(TEST_DATA, "example-project");
        const filePath = path.join(servePath, "stuff.html");
        let fileContent;

        beforeEach(() => {
            fileContent = fs.readFileSync(filePath, "utf8");
        });

        afterEach(() => {
            fs.writeFileSync(filePath, fileContent, "utf8");
        });

        it('should send a "reload" message to the client', () => {
            const servePath = path.join(TEST_DATA, "example-project");

            const server = new Server({ servePath });

            return runBlockInServer(server, address => {
                const client = new Promise((resolve, reject) => {
                    const ws = new WebSocket(
                        `ws://localhost:${address.port}/__livestyle`
                    );
                    const timeout = setTimeout(() => {
                        reject(new Error("message not received"));
                    }, 1000);

                    ws.on("open", () => {
                        ws.send(
                            JSON.stringify({
                                type: "register",
                                args: { pathname: "/stuff.html" }
                            })
                        );
                    });

                    ws.on("error", e => {
                        clearTimeout(timeout);
                        reject(e);
                    });

                    ws.on("message", msg => {
                        if (msg === "reload") {
                            clearTimeout(timeout);
                            resolve();
                        } else {
                            reject(new Error("message was incorrect"));
                        }
                    });
                });

                return Promise.resolve().then(() => {
                    fs.writeFileSync(
                        filePath,
                        fileContent.replace("Hello", "Hello!"),
                        "utf8"
                    );

                    return client;
                });
            });
        });
    });
});
