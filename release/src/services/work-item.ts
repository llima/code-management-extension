import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import { WorkRestClient } from "azure-devops-extension-api/Work";

const client: WorkRestClient = getClient(WorkRestClient);

export async function GetWorkItemAsync(): Promise<any> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );
  const currentProject = await projectService.getProject();

  //const repositories = await client.get()

  return null;
}
