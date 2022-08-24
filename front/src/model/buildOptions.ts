import { IUserContext } from "azure-devops-extension-sdk";

export interface IBuildOptions {
    repositoryId: string;
    releaseBranch: string;
    basedBranch: string;
    mergeBranches: string[];    
    user: IUserContext;
    PAT: string;
}