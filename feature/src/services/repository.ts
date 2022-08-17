import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import {
  GitRepository,
  GitRefUpdate,
  GitRestClient,
  GitRefUpdateResult,
} from "azure-devops-extension-api/Git";

const client: GitRestClient = getClient(GitRestClient);

export async function GetRepositoriesAsync(): Promise<GitRepository[]> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );
  const currentProject = await projectService.getProject();
  const repositories = await client.getRepositories(currentProject?.name);

  return repositories;
}

export async function CreateFeatureBranchAsync(
  repositoryId: string,
  basedBranchName: string,
  branchName: string
): Promise<GitRefUpdateResult[]> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  const branch = await client.getBranch( repositoryId, `${basedBranchName}`, currentProject?.name);

  let gitRefUpdate = {} as GitRefUpdate;
  gitRefUpdate.name = `refs/heads/feature/${branchName}`;
  gitRefUpdate.oldObjectId = "0000000000000000000000000000000000000000";
  gitRefUpdate.newObjectId = branch.commit.commitId;  

  let gitRefUpdates: GitRefUpdate[] = [gitRefUpdate];
  return await client.updateRefs(
    gitRefUpdates,
    repositoryId,
    currentProject?.name
  );
}
