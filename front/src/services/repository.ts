import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import {
  GitRepository,
  GitRefUpdate,
  GitRestClient,
} from "azure-devops-extension-api/Git";
import { IBranch } from "../model/branch";

const client: GitRestClient = getClient(GitRestClient);

export async function GetRepositoriesAsync(): Promise<GitRepository[]> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  const repositories = await client.getRepositories(currentProject?.name);

  return repositories;
}

export async function GetRepositoryAsync(name: string): Promise<GitRepository> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  return await client.getRepository(name, currentProject?.name);
}

export async function CreateBranchAsync(
  branch: IBranch
): Promise<GitRepository | null> {
  if (!branch.repository) return null;

  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  const gitBranch = await client.getBranch(
    branch.repository,
    branch.basedOn ?? "main",
    currentProject?.name
  );

  let gitRefUpdate = {} as GitRefUpdate;
  gitRefUpdate.name = `refs/heads/${branch.type}/${branch.name}`;
  gitRefUpdate.oldObjectId = "0000000000000000000000000000000000000000";
  gitRefUpdate.newObjectId = gitBranch.commit.commitId;

  let gitRefUpdates: GitRefUpdate[] = [gitRefUpdate];
  await client.updateRefs(
    gitRefUpdates,
    branch.repository,
    currentProject?.name
  );

  return client.getRepository(branch.repository, currentProject?.name);
}

export async function DeleteBranchAsync(branch: IBranch): Promise<void> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  if (branch.repository && branch.name) {
    const currentProject = await projectService.getProject();
    const gitBranch = await client.getBranch(
      branch.repository,
      `${branch.type}/${branch.name}`,
      currentProject?.name
    );

    if (gitBranch) {
      let gitRefUpdate = {} as GitRefUpdate;
      gitRefUpdate.name = `refs/heads/${branch.type}/${branch.name}`;
      gitRefUpdate.oldObjectId = gitBranch.commit.commitId;
      gitRefUpdate.newObjectId = "0000000000000000000000000000000000000000";

      let gitRefUpdates: GitRefUpdate[] = [gitRefUpdate];
      await client.updateRefs(
        gitRefUpdates,
        branch.repository,
        currentProject?.name
      );
    }
  }
}

export async function UpdateRepositoryAsync(branch: IBranch): Promise<void> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  if (branch.repository && branch.name) {
    const currentProject = await projectService.getProject();
    const gitBranch = await client.getBranch(
      branch.repository,
      `${branch.type}/${branch.name}`,
      currentProject?.name
    );

    if (gitBranch) {
      let gitRepository = {} as GitRepository;
      gitRepository.defaultBranch = `refs/heads/${branch.type}/${branch.name}`;

      await client.updateRepository(
        gitRepository,
        branch.repository,
        currentProject?.name
      );
    }
  }
}
