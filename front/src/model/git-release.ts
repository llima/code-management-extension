import { IUserContext } from "azure-devops-extension-sdk";

export interface IGitRelease {    
    repositoryId: string;
    repositoryUrl: string;
    releaseBranch: string;
    basedBranch: string;
    mergeBranches: IGitMergeBranch[];
    user?: IUserContext;
    PAT: string;
}

export interface IGitMergeBranch {
    repositoryId: string;
    repositoryUrl: string;
    branch: string;
}