import { IUserContext } from "azure-devops-extension-sdk";

export interface IBranch {
    id?: string;
    type?: string;
    name?: string;
    repository?: string;
    repositoryUrl?: string;
    url?: string;
    user?: IUserContext;
    basedOn?: string;
}

