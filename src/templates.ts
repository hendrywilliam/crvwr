export const summaryTemplate = (filesContent: string): string => {
    return `You are an expert code summarizer. Please summarize the following pull request files and provide a concise summary of the changes made.
    The files contains are as follows: ${filesContent}`;
};

export const reviewTemplate = (
    filesContent: string,
    configContent?: string
): string => {
    return `You are an expert code reviewer. Please review the following pull request files and provide feedback on:
        - Code quality.
        - Best practices and idioms based within a language.
        - Code smells.
        - Potential bugs and issues.
        - Suggestions for improvement.
        - Security vulnerabilities.
        - Performance optimizations.
        - Code structure and organization.
        ${
            configContent
                ? `Review this code considering this repository's linter and formatter rules: ${configContent}`
                : ""
        }
        The files contains are as follows: ${filesContent}`;
};
