import { AppContext, Command, type CommandExecutionContext, type CommandResult, type OptionSchema, type OptionValues } from "@pablozaiden/terminatui";

const dummyOptions = {
  inputStr: {
    type: "string",
    description: "Input string to process",
    required: true,
  },
} satisfies OptionSchema;

export class DummyCommand extends Command<typeof dummyOptions> {
    override name: string = "dummy";
    override description: string = "This is a dummy command";
    override options = dummyOptions;

    override async execute(config: OptionValues<typeof dummyOptions>, _execCtx?: CommandExecutionContext): Promise<CommandResult> {
        const inputStr = config.inputStr;

        AppContext.current.logger.trace(`Dummy command received input: ${inputStr}`);

        return {
            success: true,
            data: {
                inputStr,
            },
            message: "Dummy command executed successfully",
        }
    }

}