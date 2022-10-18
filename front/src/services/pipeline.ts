import * as DevOps from "azure-devops-extension-sdk";
import { IProjectPageService } from "azure-devops-extension-api";

import { getClient } from "azure-devops-extension-api";
import {
  AgentPoolQueue,
  AgentSpecification,
  Build,
  BuildDefinition,
  BuildDefinitionStep,
  BuildDefinitionVariable,
  BuildRepository,
  BuildRestClient,
  BuildResult,
  BuildStatus,
  DefinitionType,
  DesignerProcess,
  DesignerProcessTarget,
  Phase,
  TaskAgentPoolReference,
  TaskDefinitionReference,
} from "azure-devops-extension-api/Build";

import { IGitRelease } from "../model/git-release";
import { ProjectStatus } from "../model/project-status";

const client: BuildRestClient = getClient(BuildRestClient);

export interface PhaseTargetScript {
  type: number;
  allowScriptsAuthAccessOption: boolean;
}

export async function CreateBuildDefinitionAsync(
  repositoryName: string,
  options: IGitRelease
): Promise<BuildDefinition> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );
  const currentProject = await projectService.getProject();

  const repository = {} as BuildRepository;
  repository.type = "TfsGit";
  repository.id = options.repositoryId;
  repository.defaultBranch = "refs/heads/main";

  const agent = {} as AgentSpecification;
  agent.identifier = "ubuntu-20.04";

  const target = {} as DesignerProcessTarget;
  target.agentSpecification = agent;

  const phaseTarget = {} as PhaseTargetScript;
  phaseTarget.type = 1;
  phaseTarget.allowScriptsAuthAccessOption = true;

  const task = {} as TaskDefinitionReference;
  task.id = "3522c94e-933c-4ba7-b229-6faf115820c7";
  task.versionSpec = "1.*";
  task.definitionType = "task";

  const step = {} as BuildDefinitionStep;
  step.task = task;
  step.displayName = "Code Management Release Merge";
  step.enabled = true;
  step.inputs = {
    repositoryUrl: options.repositoryUrl,
    releaseBranch: options.releaseBranch,
    basedBranch: options.basedBranch,
    mergeBranches: JSON.stringify(options.mergeBranches),
  };

  const phase = {} as Phase;
  phase.name = "Agent job Release Merge";
  phase.refName = "Job_RC";
  phase.condition = "succeeded()";
  phase.jobAuthorizationScope = 1;
  phase.target = phaseTarget;
  phase.steps = [step];

  const designerProcess = {} as DesignerProcess;
  designerProcess.type = 1;
  designerProcess.target = target;
  designerProcess.phases = [phase];

  const taskAgentPoolReference = {} as TaskAgentPoolReference;
  taskAgentPoolReference.isHosted = true;
  taskAgentPoolReference.name = "Azure Pipelines";

  const agentPoolQueue = {} as AgentPoolQueue;
  agentPoolQueue.pool = taskAgentPoolReference;
  agentPoolQueue.name = "Azure Pipelines";

  const definition = {} as BuildDefinition;
  definition.name = `CODE-MANAGEMENT-RELEASE-${repositoryName}-${new Date().getTime()}`;
  definition.type = DefinitionType.Build;
  definition.repository = repository;
  definition.process = designerProcess;
  definition.queue = agentPoolQueue;

  const PAT = {} as BuildDefinitionVariable;
  PAT.isSecret = true;
  PAT.value = options.PAT;

  const userName = {} as BuildDefinitionVariable;
  userName.isSecret = true;
  userName.value = options.user?.displayName ?? "";

  const userMail = {} as BuildDefinitionVariable;
  userMail.isSecret = true;
  userMail.value = options.user?.name ?? "";

  definition.variables = {
    code_management_pat: PAT,
    code_management_username: userName,
    code_management_usermail: userMail,
  };

  return await client.createDefinition(definition, currentProject?.name ?? "");
}

export async function DeletePipelineAsync(
  buildDefinitionId: number
): Promise<void> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );

  const currentProject = await projectService.getProject();
  return await client.deleteDefinition(
    currentProject?.name ?? "",
    buildDefinitionId
  );
}

export async function RunBuildAsync(buildDefinitionId: number): Promise<Build> {
  const projectService = await DevOps.getService<IProjectPageService>(
    "ms.vss-tfs-web.tfs-page-data-service"
  );
  const currentProject = await projectService.getProject();

  const build = {} as Build;
  build.definition = await client.getDefinition(
    currentProject?.name ?? "",
    buildDefinitionId
  );

  if (build.definition) {
    return await client.queueBuild(build, currentProject?.name ?? "");
  }

  throw new Error(`Can't find build definition with id - ${buildDefinitionId}`);
}

export async function GetBuildStatusAsync(
  buildId: number
): Promise<ProjectStatus> {
  try {
    const projectService = await DevOps.getService<IProjectPageService>(
      "ms.vss-tfs-web.tfs-page-data-service"
    );

    const currentProject = await projectService.getProject();
    const build = await client.getBuild(currentProject?.name ?? "", buildId);

    if (build == null) {
      return ProjectStatus.Succeeded;
    }

    switch (build.status) {
      case BuildStatus.None:
      case BuildStatus.InProgress:
      case BuildStatus.NotStarted:
        return ProjectStatus.Running;
      case BuildStatus.Cancelling:
        return ProjectStatus.Failed;
      case BuildStatus.Completed: {
        return build.result === BuildResult.Succeeded
          ? ProjectStatus.Succeeded
          : ProjectStatus.Failed;
      }
      default:
        return ProjectStatus.Running;
    }
  } catch (error) {
    return ProjectStatus.Succeeded;
  }
}