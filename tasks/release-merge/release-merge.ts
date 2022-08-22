import tl = require("azure-pipelines-task-lib/task");
import path = require("path");
import shell = require("shelljs");


function makeGitUrl(url: string, username: string, pass: string): string {
  const type = username && pass ? 1 : !username && pass ? 2 : 0;
  if (type === 0) {
    return url;
  }

  let repo = url.replace("https://", "");
  if (repo.includes("@")) {
    repo = repo.replace(repo.split("@")[0] + "@", "");
  }

  switch (type) {
    case 1:
      return `https://${username}:${pass}@${repo}`;
    case 2:
      return `https://${pass}@${repo}`;
    default:
      return "";
  }
}

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const sourceRepository = tl.getPathInput("sourceRepository", true) ?? "";
    const releaseBranch = tl.getPathInput("releaseBranch", true) ?? "";
    const basedBranch = tl.getPathInput("basedBranch", true) ?? "develop";
    const mergeBranches = tl.getPathInput("mergeBranches", true) ?? "";

    const username = tl.getVariable("code_management_username") ?? "";
    const usermail = tl.getVariable("code_management_usermail") ?? "";
    const PAT = tl.getVariable("code_management_pat") ?? "";

    const workingDirectory = tl.getVariable("System.DefaultWorkingDirectory");
    const sourceFolder = "CODE-MANAGEMENT-REPOS";

    const sourceGitUrl = makeGitUrl(sourceRepository, username, PAT);
    shell.exec(`git clone ${sourceGitUrl} ${sourceFolder}`);

    shell.cd(sourceFolder);

    shell.exec(`git checkout ${basedBranch}`);
    shell.exec(`git checkout -b ${releaseBranch}`);

    shell.exec(`git config user.email \"${usermail}\"`);
    shell.exec(`git config user.name \"${username}\"`);

    const branches = mergeBranches.split(";");
    for (let i = 0; i < branches.length; i++) {
        const b = branches[i];
        
        shell.exec(`git fetch origin ${b}`);
        shell.exec(`git merge origin/${b}`);
    }
    
    //shell.exec("git commit -m \"Release merge made with Code Management Extensions!\"");
    shell.exec(`git push origin ${releaseBranch} --force`);

    tl.setResult(tl.TaskResult.Succeeded, "Task completed!");
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

main().catch((err) => {
  tl.setResult(tl.TaskResult.Failed, err);
});