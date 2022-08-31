import { IUserContext } from "azure-devops-extension-sdk";

export interface IRelease {    
    repositoryId: string;
    releaseBranch: string;
    basedBranch: string;
    mergeBranches: IMergeBranch[];
    user?: IUserContext;
    PAT: string;
}

export interface IMergeBranch {
    repositoryUrl: string;
    branch: string;
}