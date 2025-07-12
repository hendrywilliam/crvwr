import type { Probot } from "probot";
import { anthropic } from "./antrophic.js";
import { reviewTemplate, summaryTemplate } from "./templates.js";
import { crvwrIgnoreFile, ignoredFiles } from "./list-files.js";
import { decode } from "./helpers.js";

export default (app: Probot) => {
    app.on(
        ["pull_request.opened", "pull_request.synchronize"],
        async (context) => {
            try {
                const { owner, repo } = context.repo();

                const [pullRequestFiles, crvwrFile] = await Promise.allSettled([
                    context.octokit.pulls.listFiles({
                        owner,
                        repo,
                        pull_number: context.payload.pull_request.number,
                    }),
                    context.octokit.repos.getContent({
                        owner,
                        repo,
                        path: crvwrIgnoreFile,
                    }),
                ]);

                let pullRequestFilesContent = "";
                if (pullRequestFiles.status === "fulfilled") {
                    if (crvwrFile.status === "fulfilled") {
                        const crvwrFileData = crvwrFile.value.data;
                        if (
                            "content" in crvwrFileData &&
                            crvwrFileData.encoding === "base64" &&
                            crvwrFileData.type === "file"
                        ) {
                            const ignoredFiles = decode(
                                crvwrFileData.content
                            ).split("\n");
                            context.log.info(ignoredFiles);
                            pullRequestFilesContent =
                                pullRequestFiles.value.data
                                    .filter(
                                        (file) =>
                                            !ignoredFiles.includes(
                                                file.filename
                                            )
                                    )
                                    .map((file) => file.patch)
                                    .join(", ");
                        }
                    } else {
                        // Fallback.
                        pullRequestFilesContent = pullRequestFiles.value.data
                            .filter(
                                (file) => !ignoredFiles.includes(file.filename)
                            )
                            .map((file) => file.patch)
                            .join(",");
                        context.log.info(pullRequestFilesContent);
                    }
                }

                const summaryResponse = await anthropic.messages.create({
                    model: "claude-3-5-haiku-20241022",
                    stream: false,
                    max_tokens: 2048,
                    system: summaryTemplate(pullRequestFilesContent),
                    messages: [
                        {
                            content:
                                "Summarize this code change and provide a brief overview of the modifications.",
                            role: "user",
                        },
                    ],
                });
                await context.octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: context.payload.pull_request.number,
                    body:
                        summaryResponse.content[0].type === "text"
                            ? summaryResponse.content[0].text
                            : "No summary provided.",
                    event: "COMMENT",
                });
                const reviewResponse = await anthropic.messages.create({
                    model: "claude-3-5-haiku-20241022",
                    stream: false,
                    max_tokens: 2048,
                    system: reviewTemplate(pullRequestFilesContent),
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
                    body:
                        reviewResponse.content[0].type === "text"
                            ? reviewResponse.content[0].text
                            : "No feedback provided.",
                    event: "COMMENT",
                });
            } catch (error) {
                context.log.error(error);
            }
        }
    );
    app.on("pull_request_review", async (context) => {
        try {
            context.log.info(context.payload);
        } catch (error) {
            context.log.error(error);
        }
    });
};
