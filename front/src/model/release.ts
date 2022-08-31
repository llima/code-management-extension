import { IUserContext } from "azure-devops-extension-sdk";
import { ProjectStatus } from "./project-status";

export interface IRelease {
    id?: string;
    name?: string;
    user?: IUserContext;
    branches: IBranchRelease[];
}

export interface IBranchRelease {
    name?: string;
    repository?: string;
    repositoryUrl?: string;
    url?: string;
    projectStatus?: ProjectStatus;
    buildDefinitionId?: number;
    buildRunId?: number;
}
