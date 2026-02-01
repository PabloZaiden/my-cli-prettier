import { AppContext, TuiApplication, type SupportedMode } from "@pablozaiden/terminatui";
import pkg from "../package.json";
import { DummyCommand } from "./commands/DummyCommand";

export class MyCLIPrettierApp extends TuiApplication {
    protected override defaultMode: SupportedMode = "cli";

    constructor() {
        super({
            name: "my-cli-prettier",
            displayName: "🖥️ My CLI is Prettier",
            version: pkg.version,
            commitHash: pkg.config?.commitHash,
            commands: [
                new DummyCommand(),
            ],

            logger: {
                detailed: false,
            },
        });

        // Set up lifecycle hooks
        this.setHooks({
            onError: async (error) => {
                AppContext.current.logger.error(`Error: ${error.message}`);
                process.exitCode = 1;
            },
        });
    }
}