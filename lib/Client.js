class Client {
    constructor(options) {
        options = options || {};

        this.reLiveStyle = options.reLiveStyle;
        this.clientState = "created";
        this.onReload = options.onReload;
        this.unseenChangesByAssetPath = {};
    }

    clearUnseenChanges() {
        this.unseenChangesByAssetPath = {};
    }

    getUnseenChanges() {
        return this.unseenChangesByAssetPath;
    }

    setUnseenChanges(unseenChangesByAssetPath) {
        this.unseenChangesByAssetPath = unseenChangesByAssetPath;
    }

    processEvent(msg) {
        switch (msg.type) {
            case "open":
                this.clientState = "ready";
                this.reLiveStyle.addClient(this);
                break;
            case "register":
                this.clientState = "active";
                this.reLiveStyle.linkClient(this, msg.args.pathname);
                break;
            case "reload":
                this.processReload(msg.args.assetPath);
                break;
            case "close":
                this.clientState = "dead";
                this.reLiveStyle.removeClient(this);
                break;
        }
    }

    processReload(assetPath) {
        if (this.clientState === "active") {
            this.onReload();
        } else {
            this.unseenChangesByAssetPath[assetPath] = true;
        }
    }
}

module.exports = Client;