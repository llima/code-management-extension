import * as DevOps from "azure-devops-extension-sdk";
import {
    IExtensionDataManager,
    IProjectPageService
} from "azure-devops-extension-api";

import {
    IRelease,
} from "../model/release";

import { getStorageManager } from "./storage";
import { IService } from "./services";

export interface IReleaseService extends IService {
    getById(id: string): Promise<IRelease | null>;
    getAll(): Promise<IRelease[]>;
    save(release: IRelease): Promise<IRelease>;
    remove(id: string): Promise<void>;
}

export const ReleaseServiceId = "ReleaseService";

export class ReleaseService implements IReleaseService {

    manager: IExtensionDataManager | undefined;

    constructor() {
        this.getManager();
    }

    async getAll(): Promise<IRelease[]> {
        const manager = await this.getManager();

        try {
            return await manager.getDocuments(await this._getCollection(), {
                defaultValue: []
            });
        } catch {
            return [];
        }
    }

    async getById(id: string): Promise<IRelease | null> {
        const manager = await this.getManager();

        try {
            return await manager.getDocument(await this._getCollection(), id);
        } catch {
            return null;
        }
    }

    async save(release: IRelease): Promise<IRelease> {
        const manager = await this.getManager();
        await manager.setDocument(await this._getCollection(), release);
        return release;
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
        const releaseCollection = "BaseReleaseCollections";

        const projectPageService = await DevOps.getService<IProjectPageService>(
            "ms.vss-tfs-web.tfs-page-data-service"
        );

        const projectInfo = await projectPageService.getProject();
        return `${releaseCollection}-${projectInfo?.id}`;
    }
}
