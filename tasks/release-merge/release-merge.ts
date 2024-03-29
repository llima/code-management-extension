import tl = require("azure-pipelines-task-lib/task");
import path = require("path");
import shell = require("shelljs");
import { IMergeBranch } from "./model/release";

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

function getFixes(name: string) {
  var a = name.split("#");
  var b = a[1].split("-");    
      
  return `fixes #${b[0]}`;
}

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const repositoryUrl = tl.getPathInput("repositoryUrl", true) ?? "";
    const releaseBranch = tl.getPathInput("releaseBranch", true) ?? "";
    const basedBranch = tl.getPathInput("basedBranch", true) ?? "main";
    const mergeBranches = tl.getPathInput("mergeBranches", true) ?? "";

    const username = tl.getVariable("code_management_username") ?? "";
    const usermail = tl.getVariable("code_management_usermail") ?? "";
    const PAT = tl.getVariable("code_management_pat") ?? "";

    const sourceFolderTitle = "CODE-MANAGEMENT-RELEASE-REPOS";

    const sourceFolder = `${sourceFolderTitle}`;
    const sourceGitUrl = makeGitUrl(repositoryUrl, username, PAT);
    shell.exec(`git clone ${sourceGitUrl} ${sourceFolder}`);

    //CHANGE DIRECTORY
    shell.cd(`${sourceFolder}`);

    shell.exec(`git checkout ${releaseBranch}`);

    shell.exec(`git config user.email \"${usermail}\"`);
    shell.exec(`git config user.name \"${username}\"`);

    const branches = JSON.parse(mergeBranches) as IMergeBranch[];
    for (let j = 0; j < branches.length; j++) {
      const b = branches[j].branch;

      shell.exec(`git fetch origin ${b}`);
      shell.exec(`git merge origin/${b} --no-edit`);
    }
    
    const fixes = branches.map(u => getFixes(u.branch)).join(', ');
    
    shell.exec(`git commit -m \"Release Done - ${fixes}\" --allow-empty`);
    shell.exec(`git push origin ${releaseBranch} --force`);

    shell.cd("..");

    tl.setResult(tl.TaskResult.Succeeded, "Task completed!");
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

main().catch((err) => {
  tl.setResult(tl.TaskResult.Failed, err);
});
