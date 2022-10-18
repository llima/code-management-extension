import tl = require("azure-pipelines-task-lib/task");
import path = require("path");
import shell = require("shelljs");

function makeGitUrl(url: string, pass: string): string {
  let repo = url.replace("https://", "");
  if (repo.includes("@")) {
    repo = repo.replace(repo.split("@")[0] + "@", "");
  }

  return `https://${pass}@${repo}`;  
}

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const repositoryUrl = tl.getPathInput("repositoryUrl", true) ?? "";
    const mainBranch = tl.getPathInput("mainBranch", true) ?? "";    
    const sourceBranch = tl.getPathInput("sourceBranch", true) ?? "";
    const tagBranch = tl.getBoolInput("tagBranch", false);    

    const username = tl.getVariable("Code.Management.UserName") ?? "";
    const usermail = tl.getVariable("Code.Management.UserMail") ?? "";
    const PAT = tl.getVariable("Code.Management.PAT") ?? "";

    const sourceFolderTitle = "CODE-MANAGEMENT-MAIN-REPOS";

    const sourceFolder = `${sourceFolderTitle}`;
    const sourceGitUrl = makeGitUrl(repositoryUrl, PAT);
    shell.exec(`git clone ${sourceGitUrl} ${sourceFolder}`);

    //CHANGE DIRECTORY
    shell.cd(`${sourceFolder}`);

    shell.exec(`git checkout ${mainBranch}`);

    shell.exec(`git config user.email \"${usermail}\"`);
    shell.exec(`git config user.name \"${username}\"`);

    const releaseBranch = sourceBranch.replace("refs/heads/", "");
    console.log(`Source Branch - ${releaseBranch}`);

    shell.exec(`git fetch origin ${releaseBranch}`);
    shell.exec(`git merge origin/${releaseBranch} --no-edit`);    
    
    shell.exec(`git push origin ${mainBranch} --force`);
    shell.exec(`git push -d origin ${releaseBranch}`);

    if (tagBranch) {
      const tag = tl.getPathInput("tag", true) ?? "v1.0.0";
      const tagMessage = tl.getPathInput("tagMessage", true) ?? "";
      
      console.log(`Tagging - v${tag}`);
      shell.exec(`git tag -a \"${tag}\" -m \"${tagMessage}\"`);

      shell.exec(`git push origin ${mainBranch} --tags --force`);
    }

    shell.cd("..");

    tl.setResult(tl.TaskResult.Succeeded, "Task completed!");
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

main().catch((err) => {
  tl.setResult(tl.TaskResult.Failed, err);
});
