import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import { GitRepository, GitRefUpdate, GitRestClient, GitRef } from "azure-devops-extension-api/Git";

const client: GitRestClient = getClient(GitRestClient);

export async function GetRepositoriesAsync(): Promise<GitRepository[]> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );
  const currentProject = await projectService.getProject();

  var repositories = await client.getRepositories(currentProject?.name);
  return repositories;
}

export async function CreateFeatureBranchAsync(
    repositoryId: string,
    basedBranchName: string,
    branchName: string
  ): Promise<GitRef> {
    
    const projectService = await DevOps.getService<IProjectPageService>(
      "ms.vss-tfs-web.tfs-page-data-service"
    );
    
    const currentProject = await projectService.getProject();
    var repository = await client.getRepository(repositoryId, currentProject?.name);

    var branch = await client.getBranch(repository.id, `heads/${basedBranchName}`, currentProject?.name);

    var gitRefUpdate = {} as GitRefUpdate;
    gitRefUpdate.name = `refs/heads/feature/${branchName}`;
    gitRefUpdate.oldObjectId = "0000000000000000000000000000000000000000";
    gitRefUpdate.newObjectId = branch.commit.commitId;
    gitRefUpdate.isLocked = false;

    return await client.updateRef(gitRefUpdate, repository.id, basedBranchName, currentProject?.name);
  }
