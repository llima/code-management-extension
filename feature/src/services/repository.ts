import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import {
  GitRepository,
  GitRefUpdate,
  GitRestClient,
  GitRefUpdateResult,
  GitMergeParameters,
  GitMerge,
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
  const branch = await client.getBranch(
    repositoryId,
    `${basedBranchName}`,
    currentProject?.name
  );

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

export async function MergeReleaseBranchesAsync(
  repositoryId: string,
  releaseBranch: string,
  featureBranches: string[]
): Promise<GitMerge> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  const commits: string[] = [];

  for (let i = 0; i < featureBranches.length; i++) {
    const branchName = featureBranches[i];
    const branch = await client.getBranch(repositoryId, `${branchName}`, currentProject?.name);
    
    commits.push(branch.commit.commitId);
  }

  let gitMergeParameters = {} as GitMergeParameters;
  gitMergeParameters.comment = "Merge release v1";
  gitMergeParameters.parents = commits;  

  return await client.createMergeRequest(gitMergeParameters, currentProject?.name ?? "", repositoryId, false);
}
