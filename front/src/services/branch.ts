import * as DevOps from "azure-devops-extension-sdk";
import {
    IExtensionDataManager,
    IProjectPageService
} from "azure-devops-extension-api";

import {
    IBranch,
} from "../model/branch";

import { getStorageManager } from "./storage";
import { IService } from "./services";

export interface IBranchService extends IService {
    getById(id: string): Promise<IBranch | null>;
    getAll(): Promise<IBranch[]>;
    save(branch: IBranch): Promise<IBranch>;
    remove(id: string): Promise<void>;
}

export const BranchServiceId = "BranchService";

export class BranchService implements IBranchService {

    manager: IExtensionDataManager | undefined;

    constructor() {
        this.getManager();
    }

    async getAll(): Promise<IBranch[]> {
        const manager = await this.getManager();

        try {
            return await manager.getDocuments(await this._getCollection(), {
                defaultValue: []
            });
        } catch {
            return [];
        }
    }

    async getById(id: string): Promise<IBranch | null> {
        const manager = await this.getManager();

        try {
            return await manager.getDocument(await this._getCollection(), id);
        } catch {
            return null;
        }
    }

    async save(branch: IBranch): Promise<IBranch> {
        const manager = await this.getManager();
        await manager.setDocument(await this._getCollection(), branch);
        return branch;
    }

    async remove(id: string): Promise<void> {
        const manager = await this.getManager();
        try {
            await manager.deleteDocument(await this._getCollection(), id);
        } catch {
            // Ignore
        }
    }

    private async getManager(): Promise<IExtensionDataManager> {
        if (!this.manager) {
            this.manager = await getStorageManager();
        }
        return this.manager;
    }

    private async _getCollection(): Promise<string> {
        const branchCollection = "BaseBranchCollections";

        const projectPageService = await DevOps.getService<IProjectPageService>(
            "ms.vss-tfs-web.tfs-page-data-service"
        );

        const projectInfo = await projectPageService.getProject();
        return `${branchCollection}-${projectInfo?.id}`;
    }
}
