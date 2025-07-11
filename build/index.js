import { anthropic } from "./antrophic.js";
export default (app) => {
    app.on(["pull_request.opened", "pull_request.synchronize"], async (context) => {
        try {
            context.log.info(context.payload);
            const { owner, repo } = context.repo();
            const pullRequestFiles = await context.octokit.pulls.listFiles({
                owner,
                repo,
                pull_number: context.payload.pull_request.number,
            });
            app.log.info(pullRequestFiles);
            const response = await anthropic.messages.create({
                model: "claude-3-5-haiku-20241022",
                stream: false,
                max_tokens: 2048,
                system: "You are a code reviewer. Please review the following pull request files and provide feedback on the code quality, potential issues, and suggestions for improvement. The files are as follows: " +
                    pullRequestFiles.data
                        .map((file) => file.patch)
                        .join(", "),
                messages: [
                    {
                        content: "Analyze this code and provide feedback.",
                        role: "user",
                    },
                ],
            });
            await context.octokit.pulls.createReview({
                owner,
                repo,
                pull_number: context.payload.pull_request.number,
                body: response.content[0].type === "text"
                    ? response.content[0].text
                    : "No feedback provided.",
                event: "COMMENT",
            });
        }
        catch (error) {
            context.log.error(error);
        }
    });
};
//# sourceMappingURL=index.js.map